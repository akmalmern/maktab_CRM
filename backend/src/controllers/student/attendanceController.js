const { getStudentAttendanceByUserId } = require("../../services/attendance/attendanceService");

async function getMyAttendance(req, res) {
  res.json(
    await getStudentAttendanceByUserId({
      userId: req.user.sub,
      query: req.query,
    }),
  );
}

module.exports = { getMyAttendance };
