const prisma = require("../prisma");
const { ApiError } = require("../utils/apiError");
const { utcDateToTashkentIsoDate } = require("../utils/tashkentTime");

const SENTYABR_MONTH_INDEX = 8; // JS: 0-based
const MAX_GRADE = 11;

function isClassroomUniqueConflict(err) {
  if (!err || err.code !== "P2002") return false;
  const target = Array.isArray(err.meta?.target)
    ? err.meta.target.join(",")
    : String(err.meta?.target || "");
  return target.includes("name") && target.includes("academicYear");
}

function parseAcademicYear(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end !== start + 1)
    return null;
  return { start, end };
}

function getCurrentAcademicYear(date = new Date()) {
  const tashkentIso = utcDateToTashkentIsoDate(date);
  const [yearRaw, monthRaw] = String(tashkentIso).split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10) - 1; // JS month index
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    throw new ApiError(400, "INVALID_DATE", "Sana noto'g'ri");
  }
  if (month >= SENTYABR_MONTH_INDEX) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

function isSeptemberInTashkent(date = new Date()) {
  const tashkentIso = utcDateToTashkentIsoDate(date);
  const month = Number.parseInt(String(tashkentIso).split("-")[1], 10) - 1;
  return month === SENTYABR_MONTH_INDEX;
}

function getPreviousAcademicYear(targetAcademicYear) {
  const parsed = parseAcademicYear(targetAcademicYear);
  if (!parsed) return null;
  return `${parsed.start - 1}-${parsed.end - 1}`;
}

function parseClassName(name) {
  const raw = String(name || "").trim();
  const match = raw.match(/^(\d{1,2})\s*-\s*([A-Za-zА-Яа-яЁё])$/u);
  if (!match) return null;
  return {
    grade: Number(match[1]),
    suffix: String(match[2]).toUpperCase(),
  };
}

function buildTargetName(grade, suffix) {
  return `${grade}-${suffix}`;
}

function parseClassNameSafe(name) {
  const raw = String(name || "").trim();
  const match = raw.match(/^(\d{1,2})\s*-\s*(.+)$/u);
  if (!match) return null;
  const grade = Number.parseInt(match[1], 10);
  if (!Number.isFinite(grade) || grade < 1 || grade > MAX_GRADE) return null;
  const suffix = String(match[2] || "").trim().replace(/\s{2,}/g, " ");
  if (!suffix) return null;
  return {
    grade,
    suffix,
  };
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

  const sourceClassrooms = await prisma.classroom.findMany({
    where: {
      isArchived: false,
      academicYear: sourceAcademicYear,
    },
    select: {
      id: true,
      name: true,
      academicYear: true,
    },
    orderBy: { name: "asc" },
  });

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
    const parsed = parseClassNameSafe(classroom.name);
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
  const existingTargetClassrooms = targets.length
    ? await prisma.classroom.findMany({
        where: {
          name: { in: targets },
          academicYear: targetAcademicYear,
        },
        select: { id: true, name: true, academicYear: true, isArchived: true },
      })
    : [];
  const existingTargetByKey = new Map(
    existingTargetClassrooms.map((row) => [
      `${row.name}__${row.academicYear}`,
      row,
    ]),
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

      const activeEnrollments = await tx.enrollment.findMany({
        where: {
          classroomId: item.id,
          isActive: true,
        },
        select: { id: true, studentId: true },
      });
      const enrollmentIds = activeEnrollments.map((row) => row.id);
      const studentIds = [
        ...new Set(activeEnrollments.map((row) => row.studentId)),
      ];

      if (enrollmentIds.length) {
        await tx.enrollment.updateMany({
          where: { id: { in: enrollmentIds } },
          data: { isActive: false, endDate: now },
        });
      }

      if (studentIds.length) {
        // Safety: bitta studentga bir vaqtda bitta aktiv enrollment.
        await tx.enrollment.updateMany({
          where: {
            studentId: { in: studentIds },
            isActive: true,
          },
          data: {
            isActive: false,
            endDate: now,
          },
        });

        await tx.enrollment.createMany({
          data: studentIds.map((studentId) => ({
            studentId,
            classroomId: targetClassroomId,
            startDate: now,
            isActive: true,
          })),
          skipDuplicates: true,
        });
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
  parseClassName: parseClassNameSafe,
  isClassroomUniqueConflict,
  buildAnnualPromotionPlan,
  applyAnnualPromotion,
};
