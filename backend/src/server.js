require("dotenv").config();
const { env } = require("./config/env");
const app = require("./app");
const { applyAnnualPromotion } = require("./services/classroomPromotionService");

const PORT = env.PORT;
const ENABLE_AUTO_CLASS_PROMOTION = env.ENABLE_AUTO_CLASS_PROMOTION;

async function runAutoClassroomPromotion() {
  try {
    const result = await applyAnnualPromotion({
      referenceDate: new Date(),
      mode: "auto",
      force: false,
      actorUserId: null,
    });
    if (!result.skipped) {
      console.log(
        `[AUTO_CLASS_PROMOTION] promoted=${result.applied.promoted} graduated=${result.applied.graduated} year=${result.plan.sourceAcademicYear}->${result.plan.targetAcademicYear}`,
      );
    } else {
      console.log(`[AUTO_CLASS_PROMOTION] skipped: ${result.reason}`);
    }
  } catch (error) {
    console.error("[AUTO_CLASS_PROMOTION] error:", error?.message || error);
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (ENABLE_AUTO_CLASS_PROMOTION) {
    runAutoClassroomPromotion();
    setInterval(runAutoClassroomPromotion, 12 * 60 * 60 * 1000);
  }
});
