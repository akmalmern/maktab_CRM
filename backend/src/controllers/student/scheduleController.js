const {
  getStudentWeeklyScheduleByUserId,
} = require("../../services/schedule/scheduleService");

async function getStudentHaftalikJadval(req, res) {
  const result = await getStudentWeeklyScheduleByUserId({
    userId: req.user.sub,
    requestedAcademicYear: req.query.oquvYili,
  });

  res.json({
    ok: true,
    ...result,
  });
}

module.exports = { getStudentHaftalikJadval };
