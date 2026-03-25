const { Prisma } = require("@prisma/client");
const prisma = require("../../prisma");
const {
  parseSanaOrToday,
  buildRangeByType,
  buildAllRanges,
} = require("../../utils/attendancePeriod");
const {
  utcDateToTashkentIsoDate,
} = require("../../utils/tashkentTime");
const {
  parseIntSafe,
  toIsoDate,
  normalizeHolatCounts,
  calcFoizFromCounts,
  getTeacherAttendanceScopeByUserId,
  getStudentAttendanceScopeByUserId,
} = require("./attendanceScope");
const {
  executeGetAdminAttendanceReportCore,
  executeGetAdminAttendanceReportData,
} = require("./useCases/queryAdminAttendanceReport");
const {
  executeGetTeacherAttendanceHistoryByUserId,
} = require("./useCases/queryTeacherAttendanceHistory");
const {
  executeGetStudentAttendanceByUserId,
} = require("./useCases/queryStudentAttendance");

function buildAttendanceReadDeps() {
  return {
    Prisma,
    prisma,
    parseSanaOrToday,
    buildRangeByType,
    buildAllRanges,
    utcDateToTashkentIsoDate,
    parseIntSafe,
    toIsoDate,
    normalizeHolatCounts,
    calcFoizFromCounts,
    getTeacherAttendanceScopeByUserId,
    getStudentAttendanceScopeByUserId,
  };
}

async function getAdminAttendanceReportCore(query = {}, options = {}) {
  return executeGetAdminAttendanceReportCore({
    deps: buildAttendanceReadDeps(),
    query,
    options,
  });
}

async function getAdminAttendanceReportData(query = {}) {
  return executeGetAdminAttendanceReportData({
    deps: buildAttendanceReadDeps(),
    query,
  });
}

async function getTeacherAttendanceHistoryByUserId({ userId, query = {} }) {
  return executeGetTeacherAttendanceHistoryByUserId({
    deps: buildAttendanceReadDeps(),
    userId,
    query,
  });
}

async function getStudentAttendanceByUserId({ userId, query = {} }) {
  return executeGetStudentAttendanceByUserId({
    deps: buildAttendanceReadDeps(),
    userId,
    query,
  });
}

module.exports = {
  getAdminAttendanceReportCore,
  getAdminAttendanceReportData,
  getTeacherAttendanceHistoryByUserId,
  getStudentAttendanceByUserId,
};
