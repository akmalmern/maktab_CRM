const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { parseSanaOrToday, localTodayIsoDate } = require("../../utils/attendancePeriod");
const { getTeacherAttendanceScopeByUserId } = require("./attendanceScope");
const { ensureDateMatchesLessonDay } = require("./attendanceTeacherShared");
const {
  createDarsDateTimeUTC,
  buildRealLessonTiming,
} = require("./shared/attendanceLessonTiming");
const {
  createAttendanceInfrastructure,
} = require("./shared/attendanceInfrastructure");
const {
  executeSaveTeacherAttendanceSession,
} = require("./useCases/saveTeacherAttendanceSession");
const payrollService = require("../payroll/payrollService");

const MAIN_ORG_KEY = "MAIN";
const MAIN_ORG_NAME = "Asosiy tashkilot";

const { ensureMainOrganization } = createAttendanceInfrastructure({
  mainOrgKey: MAIN_ORG_KEY,
  mainOrgName: MAIN_ORG_NAME,
});

function buildAttendanceWriteDeps() {
  return {
    prisma,
    ApiError,
    parseSanaOrToday,
    localTodayIsoDate,
    getTeacherAttendanceScopeByUserId,
    ensureDateMatchesLessonDay,
    createDarsDateTimeUTC,
    buildRealLessonTiming,
    ensureMainOrganization,
    refreshDraftPayrollForLesson: payrollService.refreshDraftPayrollForLesson,
  };
}

async function saveTeacherDarsDavomatiByUserId({ userId, darsId, body }) {
  return executeSaveTeacherAttendanceSession({
    deps: buildAttendanceWriteDeps(),
    userId,
    darsId,
    body,
  });
}

module.exports = {
  saveTeacherDarsDavomatiByUserId,
};
