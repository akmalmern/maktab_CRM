const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { utcDateToTashkentIsoDate } = require("../../utils/tashkentTime");

function parseIntSafe(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toIsoDate(date) {
  return utcDateToTashkentIsoDate(date);
}

function normalizeHolatCounts(groupRows) {
  const counts = { KELDI: 0, KECHIKDI: 0, SABABLI: 0, SABABSIZ: 0 };
  for (const row of groupRows || []) {
    if (row?.holat && counts[row.holat] !== undefined) {
      counts[row.holat] = row._count?._all || 0;
    }
  }
  return counts;
}

function calcFoizFromCounts(total, counts) {
  if (!total) return 0;
  const present = Number(counts.KELDI || 0) + Number(counts.KECHIKDI || 0);
  return Number(((present / total) * 100).toFixed(1));
}

function calcFoiz(records = []) {
  if (!records.length) return 0;
  const present = records.filter(
    (r) => r.holat === "KELDI" || r.holat === "KECHIKDI",
  ).length;
  return Number(((present / records.length) * 100).toFixed(1));
}

async function getTeacherAttendanceScopeByUserId(userId) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!teacher) {
    throw new ApiError(404, "OQITUVCHI_TOPILMADI", "Teacher topilmadi");
  }
  return teacher;
}

async function getStudentAttendanceScopeByUserId(userId) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      enrollments: {
        where: { isActive: true },
        take: 1,
        orderBy: { createdAt: "desc" },
        include: {
          classroom: { select: { id: true, name: true, academicYear: true } },
        },
      },
    },
  });

  if (!student) {
    throw new ApiError(404, "STUDENT_TOPILMADI", "Student profili topilmadi");
  }

  return student;
}

module.exports = {
  parseIntSafe,
  toIsoDate,
  normalizeHolatCounts,
  calcFoizFromCounts,
  calcFoiz,
  getTeacherAttendanceScopeByUserId,
  getStudentAttendanceScopeByUserId,
};
