const { getAdminGrades } = require("../../services/grades/gradeService");

async function getAdminBaholar(req, res) {
  const result = await getAdminGrades({ query: req.query });

  res.json({
    ok: true,
    ...result,
  });
}

module.exports = { getAdminBaholar };

