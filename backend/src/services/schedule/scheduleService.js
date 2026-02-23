const prisma = require("../../prisma");
const {
  normalizeAcademicYear,
  resolveAcademicYearForScope,
  getTeacherScheduleScopeByUserId,
  getStudentScheduleScopeByUserId,
} = require("./scheduleScope");

const VAQT_ORALIQ_SELECT = {
  id: true,
  nomi: true,
  boshlanishVaqti: true,
  tugashVaqti: true,
  tartib: true,
};

const SCHEDULE_ORDER_BY = [{ haftaKuni: "asc" }, { vaqtOraliq: { tartib: "asc" } }];

async function findScheduleRows({ where, include }) {
  return prisma.darsJadvali.findMany({
    where,
    include,
    orderBy: SCHEDULE_ORDER_BY,
  });
}

function buildAdminScheduleWhere({ sinfId, oqituvchiId, oquvYili }) {
  const where = {};
  if (sinfId) where.sinfId = sinfId;
  if (oqituvchiId) where.oqituvchiId = oqituvchiId;

  const normalizedYear = normalizeAcademicYear(oquvYili);
  if (normalizedYear) where.oquvYili = normalizedYear;

  return where;
}

async function getAdminScheduleList(filters = {}) {
  const where = buildAdminScheduleWhere(filters);

  const darslar = await findScheduleRows({
    where,
    include: {
      sinf: { select: { id: true, name: true, academicYear: true } },
      oqituvchi: { select: { id: true, firstName: true, lastName: true } },
      fan: { select: { id: true, name: true } },
      vaqtOraliq: { select: VAQT_ORALIQ_SELECT },
    },
  });

  return { darslar };
}

async function getTeacherWeeklyScheduleByUserId({ userId, requestedAcademicYear }) {
  const teacher = await getTeacherScheduleScopeByUserId(userId);

  const { oquvYili, oquvYillar } = await resolveAcademicYearForScope({
    where: { oqituvchiId: teacher.id },
    requestedYear: requestedAcademicYear,
  });

  const darslar = await findScheduleRows({
    where: {
      oqituvchiId: teacher.id,
      ...(oquvYili ? { oquvYili } : {}),
    },
    include: {
      sinf: { select: { id: true, name: true, academicYear: true } },
      fan: { select: { id: true, name: true } },
      vaqtOraliq: { select: VAQT_ORALIQ_SELECT },
    },
  });

  return {
    teacher,
    oquvYili,
    oquvYillar,
    darslar,
  };
}

async function getStudentWeeklyScheduleByUserId({ userId, requestedAcademicYear }) {
  const { student, classroom } = await getStudentScheduleScopeByUserId(userId);

  const { oquvYili, oquvYillar } = await resolveAcademicYearForScope({
    where: { sinfId: classroom.id },
    requestedYear: requestedAcademicYear,
    preferredYears: [classroom.academicYear],
  });

  const darslar = await findScheduleRows({
    where: {
      sinfId: classroom.id,
      ...(oquvYili ? { oquvYili } : {}),
    },
    include: {
      fan: { select: { id: true, name: true } },
      oqituvchi: { select: { id: true, firstName: true, lastName: true } },
      vaqtOraliq: { select: VAQT_ORALIQ_SELECT },
    },
  });

  return {
    oquvYili,
    oquvYillar,
    student: {
      id: student.id,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
      sinf: classroom,
    },
    darslar,
  };
}

module.exports = {
  getAdminScheduleList,
  getTeacherWeeklyScheduleByUserId,
  getStudentWeeklyScheduleByUserId,
  buildAdminScheduleWhere,
};

