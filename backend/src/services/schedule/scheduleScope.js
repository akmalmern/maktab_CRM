const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");

function normalizeAcademicYear(value) {
  const normalized = String(value || "").trim();
  return normalized || "";
}

async function getDistinctAcademicYears(where = {}) {
  const rows = await prisma.darsJadvali.findMany({
    where,
    select: { oquvYili: true },
    distinct: ["oquvYili"],
    orderBy: { oquvYili: "desc" },
  });

  return [...new Set(rows.map((row) => normalizeAcademicYear(row.oquvYili)).filter(Boolean))];
}

async function resolveAcademicYearForScope({ where, requestedYear, preferredYears = [] }) {
  const oquvYillar = [
    ...new Set([
      ...preferredYears.map((year) => normalizeAcademicYear(year)).filter(Boolean),
      ...(await getDistinctAcademicYears(where)),
    ]),
  ].filter(Boolean);

  const requested = normalizeAcademicYear(requestedYear);
  const oquvYili = requested || oquvYillar[0] || "";

  return { oquvYili, oquvYillar };
}

async function getTeacherScheduleScopeByUserId(userId) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!teacher) {
    throw new ApiError(404, "OQITUVCHI_TOPILMADI", "Teacher topilmadi");
  }

  return teacher;
}

async function getStudentScheduleScopeByUserId(userId) {
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
    throw new ApiError(404, "STUDENT_TOPILMADI", "Student topilmadi");
  }

  const activeEnrollment = student.enrollments?.[0];
  if (!activeEnrollment?.classroom) {
    throw new ApiError(
      404,
      "SINF_TOPILMADI",
      "Sizga biriktirilgan aktiv sinf topilmadi",
    );
  }

  return {
    student,
    classroom: activeEnrollment.classroom,
  };
}

module.exports = {
  normalizeAcademicYear,
  getDistinctAcademicYears,
  resolveAcademicYearForScope,
  getTeacherScheduleScopeByUserId,
  getStudentScheduleScopeByUserId,
};

