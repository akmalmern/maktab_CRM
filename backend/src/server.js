require("dotenv").config();
const app = require("./app");
const { applyAnnualPromotion } = require("./services/classroomPromotionService");

const PORT = process.env.PORT || 5000;

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
  runAutoClassroomPromotion();
  setInterval(runAutoClassroomPromotion, 12 * 60 * 60 * 1000);
});
