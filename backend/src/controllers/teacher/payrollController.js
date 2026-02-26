const payrollService = require("../../services/payroll/payrollService");

async function getTeacherPayslips(req, res) {
  const result = await payrollService.getTeacherPayslipsByUserId({
    userId: req.user.sub,
    query: req.query,
  });
  res.json({ ok: true, ...result });
}

async function getTeacherPayslipDetail(req, res) {
  const result = await payrollService.getTeacherPayslipDetailByUserId({
    userId: req.user.sub,
    runId: req.params.runId,
    query: req.query,
  });
  res.json({ ok: true, ...result });
}

module.exports = {
  getTeacherPayslips,
  getTeacherPayslipDetail,
};
