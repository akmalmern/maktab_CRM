const prisma = require("../prisma");
const { ApiError } = require("../utils/apiError");

const SENTYABR_MONTH_INDEX = 8; // JS: 0-based
const MAX_GRADE = 11;

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
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (month >= SENTYABR_MONTH_INDEX) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
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
    include: {
      _count: { select: { enrollments: true } },
    },
    orderBy: { name: "asc" },
  });

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
        studentCount: classroom._count?.enrollments || 0,
      });
      continue;
    }

    promoteItems.push({
      id: classroom.id,
      sourceName: classroom.name,
      sourceAcademicYear: classroom.academicYear,
      targetName: buildTargetName(parsed.grade + 1, parsed.suffix),
      targetAcademicYear,
      studentCount: classroom._count?.enrollments || 0,
    });
  }

  const destinationKeys = promoteItems.map((item) => ({
    name: item.targetName,
    academicYear: item.targetAcademicYear,
  }));

  let conflicts = [];
  if (destinationKeys.length) {
    const existing = await prisma.classroom.findMany({
      where: {
        OR: destinationKeys,
      },
      select: { id: true, name: true, academicYear: true, isArchived: true },
    });
    const sourceIds = new Set(promoteItems.map((item) => item.id));
    conflicts = existing
      .filter((row) => !sourceIds.has(row.id))
      .map((row) => ({
        id: row.id,
        name: row.name,
        academicYear: row.academicYear,
      }));
  }

  return {
    generatedAt: new Date(),
    targetAcademicYear,
    sourceAcademicYear,
    isSeptember: referenceDate.getUTCMonth() === SENTYABR_MONTH_INDEX,
    promoteItems,
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
      "Ba'zi maqsad sinflar allaqachon mavjud, avval conflictni bartaraf qiling",
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
  const promoteIds = plan.promoteItems.map((item) => item.id);
  const graduateIds = plan.graduateItems.map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    for (const item of plan.promoteItems) {
      await tx.classroom.update({
        where: { id: item.id },
        data: {
          name: item.targetName,
          academicYear: item.targetAcademicYear,
        },
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
  parseClassName,
  buildAnnualPromotionPlan,
  applyAnnualPromotion,
};
