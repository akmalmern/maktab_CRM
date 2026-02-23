const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { localDayEndUtc, localDayStartUtc } = require("../../utils/tashkentTime");

function parseIntSafe(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toIsoDate(value) {
  return value.toISOString().slice(0, 10);
}

function buildSanaFilterFromQuery(query = {}) {
  const day = String(query.sana || "").trim();
  const sanaFrom = String(query.sanaFrom || "").trim();
  const sanaTo = String(query.sanaTo || "").trim();

  const from = day ? localDayStartUtc(day) : sanaFrom ? localDayStartUtc(sanaFrom) : undefined;
  const to = day ? localDayEndUtc(day) : sanaTo ? localDayEndUtc(sanaTo) : undefined;

  if (!from && !to) return undefined;

  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

function buildPaging(query = {}, defaultLimit = 20, maxLimit = 100) {
  const page = parseIntSafe(query.page, 1);
  const limit = Math.min(parseIntSafe(query.limit, defaultLimit), maxLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

async function getTeacherByUserId(userId) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!teacher) {
    throw new ApiError(404, "OQITUVCHI_TOPILMADI", "Teacher topilmadi");
  }
  return teacher;
}

async function getStudentByUserId(userId) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!student) {
    throw new ApiError(404, "STUDENT_TOPILMADI", "Student topilmadi");
  }
  return student;
}

async function getStudentActiveClassroomByUserId(userId) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: {
      id: true,
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

  const classroom = student.enrollments?.[0]?.classroom;
  if (!classroom) {
    throw new ApiError(
      404,
      "SINF_TOPILMADI",
      "Sizga biriktirilgan aktiv sinf topilmadi",
    );
  }

  return { student, classroom };
}

module.exports = {
  parseIntSafe,
  toIsoDate,
  buildSanaFilterFromQuery,
  buildPaging,
  getTeacherByUserId,
  getStudentByUserId,
  getStudentActiveClassroomByUserId,
};

