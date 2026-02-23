const {
  getStudentOwnGradesByUserId,
  getStudentClassGradesByUserId,
} = require("../../services/grades/gradeService");

async function getMyBaholar(req, res) {
  const result = await getStudentOwnGradesByUserId({
    userId: req.user.sub,
    query: req.query,
  });

  res.json({
    ok: true,
    ...result,
  });
}

async function getMyClassBaholar(req, res) {
  const result = await getStudentClassGradesByUserId({
    userId: req.user.sub,
    query: req.query,
  });

  res.json({
    ok: true,
    ...result,
  });
}

module.exports = { getMyBaholar, getMyClassBaholar };

