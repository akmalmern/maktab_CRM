const { ApiError } = require("../../../utils/apiError");
const classroomRepository = require("../repository");
const {
  getCurrentAcademicYear,
  getNextAcademicYear,
} = require("../domain/academicYear");

function toPositiveInt(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeSearchQuery(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

async function listClassrooms() {
  const classrooms = await classroomRepository.listActiveClassrooms();
  const items = classrooms.map((classroom) => ({
    id: classroom.id,
    name: classroom.name,
    academicYear: classroom.academicYear,
    isArchived: classroom.isArchived,
    createdAt: classroom.createdAt,
    updatedAt: classroom.updatedAt,
    studentCount: classroom._count?.enrollments || 0,
  }));

  const academicYears = [...new Set(items.map((item) => item.academicYear).filter(Boolean))].sort(
    (a, b) => b.localeCompare(a),
  );

  return { ok: true, classrooms: items, academicYears };
}

async function getClassroomsMeta(referenceDate = new Date()) {
  const classroomYearRows = await classroomRepository.listDistinctActiveAcademicYears();
  const currentAcademicYear = getCurrentAcademicYear(referenceDate);
  const nextAcademicYear = getNextAcademicYear(currentAcademicYear);
  const allowedAcademicYears = [
    ...new Set(
      [
        ...classroomYearRows.map((row) => row.academicYear).filter(Boolean),
        currentAcademicYear,
        nextAcademicYear,
      ].filter(Boolean),
    ),
  ].sort((a, b) => b.localeCompare(a));

  return {
    ok: true,
    meta: {
      currentAcademicYear,
      nextAcademicYear,
      allowedAcademicYears,
    },
  };
}

async function getClassroomStudents({
  classroomId,
  page = 1,
  limit = 20,
  search = null,
}) {
  const safePage = toPositiveInt(page, 1, { min: 1, max: 10_000 });
  const safeLimit = toPositiveInt(limit, 20, { min: 1, max: 100 });
  const safeSearch = normalizeSearchQuery(search);
  const classroom = await classroomRepository.findClassroomById(classroomId);
  if (!classroom || classroom.isArchived) {
    throw new ApiError(404, "CLASSROOM_NOT_FOUND", "Sinf topilmadi");
  }

  const result = await classroomRepository.listClassroomStudentsPage({
    classroomId,
    page: safePage,
    limit: safeLimit,
    search: safeSearch,
  });

  return {
    ok: true,
    classroom: {
      id: classroom.id,
      name: classroom.name,
      academicYear: classroom.academicYear,
    },
    page: result.page,
    limit: result.limit,
    total: result.total,
    pages: result.pages,
    students: result.students,
  };
}

module.exports = {
  listClassrooms,
  getClassroomsMeta,
  getClassroomStudents,
};
