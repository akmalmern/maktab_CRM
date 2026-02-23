const {
  getTeacherWeeklyScheduleByUserId,
} = require("../../services/schedule/scheduleService");

async function getTeacherHaftalikJadval(req, res) {
  const result = await getTeacherWeeklyScheduleByUserId({
    userId: req.user.sub,
    requestedAcademicYear: req.query.oquvYili,
  });

  res.json({
    ok: true,
    ...result,
  });
}

module.exports = { getTeacherHaftalikJadval };
