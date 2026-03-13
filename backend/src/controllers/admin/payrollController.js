const payrollService = require("../../services/payroll/payrollService");

async function listRealLessons(req, res) {
  const result = await payrollService.listRealLessons({ query: req.query });
  res.json({ ok: true, ...result });
}

async function createRealLesson(req, res) {
  const result = await payrollService.createRealLesson({
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.status(201).json({ ok: true, ...result });
}

async function updateRealLessonStatus(req, res) {
  const result = await payrollService.updateRealLessonStatus({
    lessonId: req.params.lessonId,
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function bulkUpdateRealLessonStatus(req, res) {
  const result = await payrollService.bulkUpdateRealLessonStatus({
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function listTeacherRates(req, res) {
  const result = await payrollService.listTeacherRates({ query: req.query });
  res.json({ ok: true, ...result });
}

async function createTeacherRate(req, res) {
  const result = await payrollService.createTeacherRate({
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.status(201).json({ ok: true, ...result });
}

async function updateTeacherRate(req, res) {
  const result = await payrollService.updateTeacherRate({
    rateId: req.params.rateId,
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function deleteTeacherRate(req, res) {
  const result = await payrollService.deleteTeacherRate({
    rateId: req.params.rateId,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function listSubjectDefaultRates(req, res) {
  const result = await payrollService.listSubjectDefaultRates({ query: req.query });
  res.json({ ok: true, ...result });
}

async function createSubjectDefaultRate(req, res) {
  const result = await payrollService.createSubjectDefaultRate({
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.status(201).json({ ok: true, ...result });
}

async function updateSubjectDefaultRate(req, res) {
  const result = await payrollService.updateSubjectDefaultRate({
    rateId: req.params.rateId,
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function deleteSubjectDefaultRate(req, res) {
  const result = await payrollService.deleteSubjectDefaultRate({
    rateId: req.params.rateId,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function listAdvancePayments(req, res) {
  const result = await payrollService.listAdvancePayments({ query: req.query });
  res.json({ ok: true, ...result });
}

async function listPayrollEmployees(req, res) {
  const result = await payrollService.listPayrollEmployees({ query: req.query });
  res.json({ ok: true, ...result });
}

async function updatePayrollEmployeeConfig(req, res) {
  const result = await payrollService.updatePayrollEmployeeConfig({
    employeeId: req.params.employeeId,
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function createAdvancePayment(req, res) {
  const result = await payrollService.createAdvancePayment({
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.status(201).json({ ok: true, ...result });
}

async function deleteAdvancePayment(req, res) {
  const result = await payrollService.deleteAdvancePayment({
    advanceId: req.params.advanceId,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function generatePayrollRun(req, res) {
  const result = await payrollService.generatePayrollRun({
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function getPayrollAutomationHealth(req, res) {
  const result = await payrollService.getPayrollAutomationHealth({ query: req.query });
  res.json({ ok: true, ...result });
}

async function runPayrollAutomation(req, res) {
  const result = await payrollService.runPayrollAutomation({
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function getPayrollMonthlyReport(req, res) {
  const result = await payrollService.getPayrollMonthlyReport({ query: req.query });
  res.json({ ok: true, ...result });
}

async function listPayrollRuns(req, res) {
  const result = await payrollService.listPayrollRuns({ query: req.query });
  res.json({ ok: true, ...result });
}

async function getPayrollRunDetail(req, res) {
  const result = await payrollService.getPayrollRunDetail({
    runId: req.params.runId,
    query: req.query,
  });
  res.json({ ok: true, ...result });
}

async function exportPayrollRunCsv(req, res) {
  const result = await payrollService.exportPayrollRunCsv({
    runId: req.params.runId,
    query: req.query,
  });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.send(result.csv);
}

async function exportPayrollRunExcel(req, res) {
  const result = await payrollService.exportPayrollRunExcel({
    runId: req.params.runId,
    query: req.query,
  });
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.send(result.buffer);
}

async function addPayrollAdjustment(req, res) {
  const result = await payrollService.addPayrollAdjustment({
    runId: req.params.runId,
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.status(201).json({ ok: true, ...result });
}

async function deletePayrollAdjustment(req, res) {
  const result = await payrollService.deletePayrollAdjustment({
    runId: req.params.runId,
    lineId: req.params.lineId,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function approvePayrollRun(req, res) {
  const result = await payrollService.approvePayrollRun({
    runId: req.params.runId,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function payPayrollRun(req, res) {
  const result = await payrollService.payPayrollRun({
    runId: req.params.runId,
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function payPayrollItem(req, res) {
  const result = await payrollService.payPayrollItem({
    runId: req.params.runId,
    itemId: req.params.itemId,
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

async function reversePayrollRun(req, res) {
  const result = await payrollService.reversePayrollRun({
    runId: req.params.runId,
    body: req.body,
    actorUserId: req.user.sub,
    req,
  });
  res.json({ ok: true, ...result });
}

module.exports = {
  listRealLessons,
  createRealLesson,
  updateRealLessonStatus,
  bulkUpdateRealLessonStatus,
  listTeacherRates,
  createTeacherRate,
  updateTeacherRate,
  deleteTeacherRate,
  listSubjectDefaultRates,
  createSubjectDefaultRate,
  updateSubjectDefaultRate,
  deleteSubjectDefaultRate,
  listAdvancePayments,
  listPayrollEmployees,
  updatePayrollEmployeeConfig,
  createAdvancePayment,
  deleteAdvancePayment,
  generatePayrollRun,
  getPayrollAutomationHealth,
  runPayrollAutomation,
  getPayrollMonthlyReport,
  listPayrollRuns,
  getPayrollRunDetail,
  exportPayrollRunCsv,
  exportPayrollRunExcel,
  addPayrollAdjustment,
  deletePayrollAdjustment,
  approvePayrollRun,
  payPayrollRun,
  payPayrollItem,
  reversePayrollRun,
};
