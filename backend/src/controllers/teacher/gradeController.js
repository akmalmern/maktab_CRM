const { getTeacherGradesByUserId } = require("../../services/grades/gradeService");

async function getTeacherBaholari(req, res) {
  const result = await getTeacherGradesByUserId({
    userId: req.user.sub,
    query: req.query,
  });

  res.json({
    ok: true,
    ...result,
  });
}

module.exports = { getTeacherBaholari };

