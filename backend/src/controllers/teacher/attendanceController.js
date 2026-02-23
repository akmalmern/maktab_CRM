const {
  getTeacherAttendanceHistoryByUserId,
} = require("../../services/attendance/attendanceService");
const {
  saveTeacherDarsDavomatiByUserId,
} = require("../../services/attendance/attendanceWriteService");
const {
  getTeacherDarslarByUserId,
  getTeacherDarsDavomatiByUserId,
} = require("../../services/attendance/attendanceTeacherReadService");

async function getTeacherDarslar(req, res) {
  res.json(
    await getTeacherDarslarByUserId({
      userId: req.user.sub,
      query: req.query,
    }),
  );
}

async function getDarsDavomati(req, res) {
  const { darsId } = req.params;
  res.json(
    await getTeacherDarsDavomatiByUserId({
      userId: req.user.sub,
      darsId,
      query: req.query,
    }),
  );
}

async function saveDarsDavomati(req, res) {
  const { darsId } = req.params;
  const result = await saveTeacherDarsDavomatiByUserId({
    userId: req.user.sub,
    darsId,
    body: req.body,
  });

  res.json({
    ok: true,
    message: req.t("messages.ATTENDANCE_SAVED"),
    sana: result.sana,
    count: result.count,
  });
}

async function getTeacherAttendanceHistory(req, res) {
  res.json(
    await getTeacherAttendanceHistoryByUserId({
      userId: req.user.sub,
      query: req.query,
    }),
  );
}

module.exports = {
  getTeacherDarslar,
  getDarsDavomati,
  saveDarsDavomati,
  getTeacherAttendanceHistory,
};
