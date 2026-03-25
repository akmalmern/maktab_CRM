const {
  buildAnnualPromotionPlan,
  applyAnnualPromotion,
} = require("../annualPromotionService");

async function previewAnnualPromotion({ referenceDate = new Date() } = {}) {
  const plan = await buildAnnualPromotionPlan(referenceDate);
  return {
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
  };
}

async function runAnnualPromotion({
  force = false,
  actorUserId = null,
  mode = "manual",
  referenceDate = new Date(),
  translate,
} = {}) {
  const result = await applyAnnualPromotion({
    referenceDate,
    force,
    actorUserId,
    mode,
  });

  return {
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
      ? result.reason || translate?.("messages.ANNUAL_PROMOTION_SKIPPED")
      : translate?.(
          "messages.ANNUAL_PROMOTION_DONE",
          result.applied.promoted,
          result.applied.graduated,
        ),
  };
}

module.exports = {
  previewAnnualPromotion,
  runAnnualPromotion,
};
