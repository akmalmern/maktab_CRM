const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const {
  syncStudentsMajburiyatByMainSettings,
} = require("../../services/financeMajburiyatService");
const classroomRepository = require("./repository");
const {
  MAX_GRADE,
  parseClassName,
  buildTargetName,
} = require("./domain/classroomNaming");
const {
  getCurrentAcademicYear,
  getPreviousAcademicYear,
  isSeptemberInTashkent,
} = require("./domain/academicYear");
const { moveActiveEnrollments } = require("./use-cases/moveActiveEnrollments");

function isClassroomUniqueConflict(error) {
  if (!error || error.code !== "P2002") return false;
  const target = Array.isArray(error.meta?.target)
    ? error.meta.target.join(",")
    : String(error.meta?.target || "");
  return target.includes("name") && target.includes("academicYear");
}

async function buildAnnualPromotionPlan(referenceDate = new Date()) {
  const targetAcademicYear = getCurrentAcademicYear(referenceDate);
  const sourceAcademicYear = getPreviousAcademicYear(targetAcademicYear);
  if (!sourceAcademicYear) {
    throw new ApiError(
      400,
      "INVALID_ACADEMIC_YEAR",
      "O'quv yili formati noto'g'ri",
    );
  }

  const sourceClassrooms = await classroomRepository.listActiveClassroomsByAcademicYear(
    sourceAcademicYear,
  );
  const sourceIds = sourceClassrooms.map((item) => item.id);
  const activeCountRows = sourceIds.length
    ? await prisma.enrollment.groupBy({
        by: ["classroomId"],
        where: {
          classroomId: { in: sourceIds },
          isActive: true,
        },
        _count: { _all: true },
      })
    : [];
  const activeCountMap = new Map(
    activeCountRows.map((row) => [row.classroomId, row._count?._all || 0]),
  );

  const promoteItems = [];
  const graduateItems = [];
  const skippedItems = [];

  for (const classroom of sourceClassrooms) {
    const parsed = parseClassName(classroom.name);
    if (!parsed) {
      skippedItems.push({
        id: classroom.id,
        name: classroom.name,
        academicYear: classroom.academicYear,
        reason: "Sinf nomi formatga mos emas (masalan: 7-A)",
      });
      continue;
    }

    if (parsed.grade >= MAX_GRADE) {
      graduateItems.push({
        id: classroom.id,
        sourceName: classroom.name,
        sourceAcademicYear: classroom.academicYear,
        studentCount: activeCountMap.get(classroom.id) || 0,
      });
      continue;
    }

    promoteItems.push({
      id: classroom.id,
      sourceName: classroom.name,
      sourceAcademicYear: classroom.academicYear,
      targetName: buildTargetName(parsed.grade + 1, parsed.suffix),
      targetAcademicYear,
      studentCount: activeCountMap.get(classroom.id) || 0,
    });
  }

  const destinationKeys = new Map();
  const duplicateTargets = [];
  for (const item of promoteItems) {
    const key = `${item.targetName}__${item.targetAcademicYear}`;
    const existing = destinationKeys.get(key);
    if (existing) {
      duplicateTargets.push({
        name: item.targetName,
        academicYear: item.targetAcademicYear,
        sourceClassrooms: [existing.sourceName, item.sourceName],
      });
      continue;
    }
    destinationKeys.set(key, item);
  }

  const targets = [...new Set(promoteItems.map((item) => item.targetName))];
  const existingTargetClassrooms =
    await classroomRepository.findClassroomsByNamesAndAcademicYear({
      names: targets,
      academicYear: targetAcademicYear,
    });
  const existingTargetByKey = new Map(
    existingTargetClassrooms.map((row) => [`${row.name}__${row.academicYear}`, row]),
  );

  const conflicts = [...duplicateTargets];
  const promoteItemsResolved = promoteItems.map((item) => {
    const key = `${item.targetName}__${item.targetAcademicYear}`;
    const existingTarget = existingTargetByKey.get(key);
    return {
      ...item,
      targetClassroomId: existingTarget?.id || null,
      targetExists: Boolean(existingTarget),
      targetArchived: Boolean(existingTarget?.isArchived),
    };
  });

  return {
    generatedAt: new Date(),
    targetAcademicYear,
    sourceAcademicYear,
    isSeptember: isSeptemberInTashkent(referenceDate),
    promoteItems: promoteItemsResolved,
    graduateItems,
    skippedItems,
    conflicts,
  };
}

async function applyAnnualPromotion({
  referenceDate = new Date(),
  force = false,
  actorUserId = null,
  mode = "manual",
} = {}) {
  const plan = await buildAnnualPromotionPlan(referenceDate);

  if (plan.conflicts.length) {
    throw new ApiError(
      409,
      "PROMOTION_CONFLICT",
      "Sinf nomlarini avtomat oshirishda konflikt topildi, avval nomlarni tekshiring",
      { conflicts: plan.conflicts },
    );
  }

  if (!force && mode === "auto" && !plan.isSeptember) {
    return {
      ok: true,
      skipped: true,
      reason: "AUTO mode faqat sentyabr oyida ishlaydi",
      plan,
      applied: { promoted: 0, graduated: 0, studentsAffected: 0 },
    };
  }

  if (!plan.promoteItems.length && !plan.graduateItems.length) {
    return {
      ok: true,
      skipped: true,
      reason: "O'tkazish uchun mos sinflar topilmadi",
      plan,
      applied: { promoted: 0, graduated: 0, studentsAffected: 0 },
    };
  }

  const now = new Date();
  const graduateIds = plan.graduateItems.map((item) => item.id);
  const promotedStudentIds = new Set();

  await prisma.$transaction(async (tx) => {
    for (const item of plan.promoteItems) {
      const targetClassroom =
        item.targetClassroomId &&
        (await tx.classroom.findUnique({
          where: { id: item.targetClassroomId },
          select: { id: true, isArchived: true },
        }));

      let targetClassroomId = targetClassroom?.id || null;
      if (targetClassroomId && targetClassroom?.isArchived) {
        await tx.classroom.update({
          where: { id: targetClassroomId },
          data: { isArchived: false },
        });
      }

      if (!targetClassroomId) {
        try {
          const createdClassroom = await tx.classroom.create({
            data: {
              name: item.targetName,
              academicYear: item.targetAcademicYear,
              isArchived: false,
            },
            select: { id: true },
          });
          targetClassroomId = createdClassroom.id;
        } catch (error) {
          if (!isClassroomUniqueConflict(error)) throw error;

          const racedTarget = await tx.classroom.findFirst({
            where: {
              name: item.targetName,
              academicYear: item.targetAcademicYear,
            },
            select: { id: true, isArchived: true },
          });
          if (!racedTarget) throw error;
          if (racedTarget.isArchived) {
            await tx.classroom.update({
              where: { id: racedTarget.id },
              data: { isArchived: false },
            });
          }
          targetClassroomId = racedTarget.id;
        }
      }

      const moved = await moveActiveEnrollments({
        tx,
        sourceClassroomId: item.id,
        targetClassroomId,
        at: now,
      });
      for (const studentId of moved.studentIds) {
        promotedStudentIds.add(studentId);
      }

      await tx.classroom.update({
        where: { id: item.id },
        data: { isArchived: true },
      });
    }

    if (graduateIds.length) {
      await tx.enrollment.updateMany({
        where: {
          classroomId: { in: graduateIds },
          isActive: true,
        },
        data: {
          isActive: false,
          endDate: now,
        },
      });

      await tx.classroom.updateMany({
        where: { id: { in: graduateIds } },
        data: { isArchived: true },
      });
    }

    if (actorUserId) {
      await tx.moliyaTarifAudit.create({
        data: {
          action: "CLASSROOM_ANNUAL_PROMOTION",
          performedByUserId: actorUserId,
          oldValue: {
            sourceAcademicYear: plan.sourceAcademicYear,
            mode,
          },
          newValue: {
            targetAcademicYear: plan.targetAcademicYear,
            promoted: plan.promoteItems.length,
            graduated: plan.graduateItems.length,
          },
          izoh:
            mode === "auto"
              ? "Sentyabr auto sinf yangilash bajarildi"
              : "Manual yillik sinf yangilash bajarildi",
        },
      });
    }
  });

  if (promotedStudentIds.size) {
    await syncStudentsMajburiyatByMainSettings({
      studentIds: [...promotedStudentIds],
      futureMonths: 3,
    });
  }

  return {
    ok: true,
    skipped: false,
    plan,
    applied: {
      promoted: plan.promoteItems.length,
      graduated: plan.graduateItems.length,
      studentsAffected:
        plan.promoteItems.reduce((acc, item) => acc + item.studentCount, 0) +
        plan.graduateItems.reduce((acc, item) => acc + item.studentCount, 0),
    },
  };
}

module.exports = {
  MAX_GRADE,
  getCurrentAcademicYear,
  getPreviousAcademicYear,
  isSeptemberInTashkent,
  parseClassName,
  isClassroomUniqueConflict,
  buildAnnualPromotionPlan,
  applyAnnualPromotion,
};
