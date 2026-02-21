const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { cleanOptional, parseIntSafe } = require("./helpers");
const {
  buildAnnualPromotionPlan,
  applyAnnualPromotion,
} = require("../../services/classroomPromotionService");

async function getClassrooms(_req, res) {
  const classrooms = await prisma.classroom.findMany({
    where: { isArchived: false },
    orderBy: [{ academicYear: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      academicYear: true,
      isArchived: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const classroomIds = classrooms.map((row) => row.id);
  const counts = classroomIds.length
    ? await prisma.enrollment.groupBy({
        by: ["classroomId"],
        where: {
          classroomId: { in: classroomIds },
          isActive: true,
        },
        _count: { _all: true },
      })
    : [];
  const countMap = new Map(
    counts.map((row) => [row.classroomId, row._count?._all || 0]),
  );

  const items = classrooms.map((classroom) => {
    return {
      id: classroom.id,
      name: classroom.name,
      academicYear: classroom.academicYear,
      isArchived: classroom.isArchived,
      createdAt: classroom.createdAt,
      updatedAt: classroom.updatedAt,
      studentCount: countMap.get(classroom.id) || 0,
    };
  });

  res.json({ ok: true, classrooms: items });
}

async function getClassroomStudents(req, res) {
  const { id } = req.params;
  const page = parseIntSafe(req.query.page, 1);
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;
  const search = cleanOptional(req.query.search);

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      academicYear: true,
      isArchived: true,
    },
  });
  if (!classroom || classroom.isArchived) {
    throw new ApiError(404, "CLASSROOM_NOT_FOUND", "Sinf topilmadi");
  }

  const where = {
    enrollments: {
      some: {
        classroomId: id,
        isActive: true,
      },
    },
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { user: { username: { contains: search, mode: "insensitive" } } },
            { user: { phone: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [students, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: {
          select: {
            username: true,
            phone: true,
          },
        },
      },
    }),
    prisma.student.count({ where }),
  ]);

  res.json({
    ok: true,
    classroom: {
      id: classroom.id,
      name: classroom.name,
      academicYear: classroom.academicYear,
    },
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    students,
  });
}

async function createClassroom(req, res) {
  const name = cleanOptional(req.body.name);
  const academicYear = cleanOptional(req.body.academicYear);
  if (!name || !academicYear) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "name va academicYear majburiy",
    );
  }

  const existing = await prisma.classroom.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      academicYear: { equals: academicYear, mode: "insensitive" },
    },
    select: { id: true, isArchived: true },
  });

  if (existing && !existing.isArchived) {
    throw new ApiError(
      409,
      "CLASSROOM_EXISTS",
      "Bunday sinf allaqachon mavjud",
    );
  }

  if (existing?.isArchived) {
    const restored = await prisma.classroom.update({
      where: { id: existing.id },
      data: { isArchived: false },
    });
    return res.status(201).json({ ok: true, classroom: restored });
  }

  const classroom = await prisma.classroom.create({
    data: { name, academicYear },
  });
  return res.status(201).json({ ok: true, classroom });
}

async function deleteClassroom(req, res) {
  const { id } = req.params;

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    select: { id: true, isArchived: true },
  });
  if (!classroom)
    throw new ApiError(404, "CLASSROOM_NOT_FOUND", "Sinf topilmadi");
  if (classroom.isArchived) return res.json({ ok: true });

  const activeEnrollments = await prisma.enrollment.count({
    where: { classroomId: id, isActive: true },
  });
  if (activeEnrollments > 0) {
    throw new ApiError(
      409,
      "CLASSROOM_IN_USE",
      "Bu sinfga faol studentlar biriktirilgan, o'chirib bo'lmaydi",
    );
  }

  await prisma.classroom.update({
    where: { id },
    data: { isArchived: true },
  });
  res.json({ ok: true });
}

async function previewPromoteClassroom(req, res) {
  const sourceClassroomId = req.params.id;
  const { targetClassroomId } = req.body;

  if (sourceClassroomId === targetClassroomId) {
    throw new ApiError(
      400,
      "INVALID_TARGET",
      "Manba va maqsad sinf bir xil bo'lmasligi kerak",
    );
  }

  const [sourceClassroom, targetClassroom] = await Promise.all([
    prisma.classroom.findUnique({
      where: { id: sourceClassroomId },
      select: { id: true, name: true, academicYear: true, isArchived: true },
    }),
    prisma.classroom.findUnique({
      where: { id: targetClassroomId },
      select: { id: true, name: true, academicYear: true, isArchived: true },
    }),
  ]);

  if (!sourceClassroom || sourceClassroom.isArchived) {
    throw new ApiError(
      404,
      "SOURCE_CLASSROOM_NOT_FOUND",
      "Manba sinf topilmadi",
    );
  }
  if (!targetClassroom || targetClassroom.isArchived) {
    throw new ApiError(
      404,
      "TARGET_CLASSROOM_NOT_FOUND",
      "Maqsad sinf topilmadi",
    );
  }

  const activeEnrollments = await prisma.enrollment.findMany({
    where: { classroomId: sourceClassroomId, isActive: true },
    select: {
      id: true,
      studentId: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { username: true } },
        },
      },
    },
  });

  const students = activeEnrollments
    .map((enrollment) => ({
      studentId: enrollment.studentId,
      fullName:
        `${enrollment.student.firstName} ${enrollment.student.lastName}`.trim(),
      username: enrollment.student.user?.username || "-",
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "uz"));

  res.json({
    ok: true,
    sourceClassroom: sourceClassroom,
    targetClassroom: targetClassroom,
    totalStudents: students.length,
    studentsPreview: students.slice(0, 20),
    note:
      students.length > 20
        ? `Jami ${students.length} ta. Dastlabki 20 ta student ko'rsatildi.`
        : null,
  });
}

async function promoteClassroom(req, res) {
  const sourceClassroomId = req.params.id;
  const { targetClassroomId } = req.body;

  if (sourceClassroomId === targetClassroomId) {
    throw new ApiError(
      400,
      "INVALID_TARGET",
      "Manba va maqsad sinf bir xil bo'lmasligi kerak",
    );
  }

  const [sourceClassroom, targetClassroom] = await Promise.all([
    prisma.classroom.findUnique({
      where: { id: sourceClassroomId },
      select: { id: true, name: true, academicYear: true, isArchived: true },
    }),
    prisma.classroom.findUnique({
      where: { id: targetClassroomId },
      select: { id: true, name: true, academicYear: true, isArchived: true },
    }),
  ]);

  if (!sourceClassroom || sourceClassroom.isArchived) {
    throw new ApiError(
      404,
      "SOURCE_CLASSROOM_NOT_FOUND",
      "Manba sinf topilmadi",
    );
  }
  if (!targetClassroom || targetClassroom.isArchived) {
    throw new ApiError(
      404,
      "TARGET_CLASSROOM_NOT_FOUND",
      "Maqsad sinf topilmadi",
    );
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const activeEnrollments = await tx.enrollment.findMany({
      where: { classroomId: sourceClassroomId, isActive: true },
      select: { id: true, studentId: true },
    });

    if (!activeEnrollments.length) {
      return { movedCount: 0 };
    }

    const enrollmentIds = activeEnrollments.map((enrollment) => enrollment.id);
    const uniqueStudents = [
      ...new Set(activeEnrollments.map((enrollment) => enrollment.studentId)),
    ];

    await tx.enrollment.updateMany({
      where: { id: { in: enrollmentIds } },
      data: { isActive: false, endDate: now },
    });

    // Safety: bitta studentga bir vaqtning o'zida faqat bitta aktiv enrollment qoldiramiz.
    await tx.enrollment.updateMany({
      where: {
        studentId: { in: uniqueStudents },
        isActive: true,
      },
      data: {
        isActive: false,
        endDate: now,
      },
    });

    const created = await tx.enrollment.createMany({
      data: uniqueStudents.map((studentId) => ({
        studentId,
        classroomId: targetClassroomId,
        startDate: now,
        isActive: true,
      })),
      skipDuplicates: true,
    });

    return { movedCount: created.count };
  });

  res.json({
    ok: true,
    movedCount: result.movedCount,
    sourceClassroom,
    targetClassroom,
    message:
      result.movedCount > 0
        ? req.t("messages.CLASSROOM_PROMOTED", result.movedCount)
        : req.t("messages.CLASSROOM_PROMOTION_EMPTY"),
  });
}

async function previewAnnualClassPromotion(req, res) {
  const plan = await buildAnnualPromotionPlan(new Date());
  res.json({
    ok: true,
    plan: {
      generatedAt: plan.generatedAt,
      sourceAcademicYear: plan.sourceAcademicYear,
      targetAcademicYear: plan.targetAcademicYear,
      isSeptember: plan.isSeptember,
      promoteCount: plan.promoteItems.length,
      graduateCount: plan.graduateItems.length,
      skippedCount: plan.skippedItems.length,
      conflictCount: plan.conflicts.length,
      studentsToPromote: plan.promoteItems.reduce(
        (acc, item) => acc + item.studentCount,
        0,
      ),
      studentsToGraduate: plan.graduateItems.reduce(
        (acc, item) => acc + item.studentCount,
        0,
      ),
      promoteItems: plan.promoteItems.slice(0, 30),
      graduateItems: plan.graduateItems.slice(0, 30),
      skippedItems: plan.skippedItems.slice(0, 20),
      conflicts: plan.conflicts.slice(0, 20),
    },
  });
}

async function runAnnualClassPromotion(req, res) {
  const force = Boolean(req.body.force);
  const result = await applyAnnualPromotion({
    referenceDate: new Date(),
    force,
    actorUserId: req.user?.sub || null,
    mode: "manual",
  });

  res.json({
    ok: true,
    skipped: result.skipped,
    reason: result.reason || null,
    applied: result.applied,
    plan: {
      sourceAcademicYear: result.plan.sourceAcademicYear,
      targetAcademicYear: result.plan.targetAcademicYear,
      promoteCount: result.plan.promoteItems.length,
      graduateCount: result.plan.graduateItems.length,
      conflictCount: result.plan.conflicts.length,
    },
    message: result.skipped
      ? result.reason || req.t("messages.ANNUAL_PROMOTION_SKIPPED")
      : req.t(
          "messages.ANNUAL_PROMOTION_DONE",
          result.applied.promoted,
          result.applied.graduated,
        ),
  });
}

module.exports = {
  getClassrooms,
  getClassroomStudents,
  createClassroom,
  deleteClassroom,
  previewPromoteClassroom,
  promoteClassroom,
  previewAnnualClassPromotion,
  runAnnualClassPromotion,
};
