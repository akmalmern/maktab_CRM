const prisma = require("../../prisma");

const classroomSummarySelect = {
  id: true,
  name: true,
  academicYear: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
};

function getDb(db) {
  return db || prisma;
}

async function listActiveClassrooms(db) {
  return getDb(db).classroom.findMany({
    where: { isArchived: false },
    orderBy: [{ academicYear: "desc" }, { name: "asc" }],
    select: {
      ...classroomSummarySelect,
      _count: {
        select: {
          enrollments: {
            where: { isActive: true },
          },
        },
      },
    },
  });
}

async function listDistinctActiveAcademicYears(db) {
  return getDb(db).classroom.findMany({
    where: { isArchived: false },
    select: { academicYear: true },
    distinct: ["academicYear"],
    orderBy: { academicYear: "desc" },
  });
}

async function listActiveClassroomsByAcademicYear(academicYear, db) {
  return getDb(db).classroom.findMany({
    where: {
      isArchived: false,
      academicYear,
    },
    select: {
      id: true,
      name: true,
      academicYear: true,
    },
    orderBy: { name: "asc" },
  });
}

async function findClassroomById(id, db) {
  return getDb(db).classroom.findUnique({
    where: { id },
    select: classroomSummarySelect,
  });
}

async function findClassroomByNameAndAcademicYear({ name, academicYear }, db) {
  return getDb(db).classroom.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      academicYear: { equals: academicYear, mode: "insensitive" },
    },
    select: { id: true, isArchived: true },
  });
}

async function findClassroomsByNamesAndAcademicYear({ names, academicYear }, db) {
  if (!names.length) return [];

  return getDb(db).classroom.findMany({
    where: {
      name: { in: names },
      academicYear,
    },
    select: { id: true, name: true, academicYear: true, isArchived: true },
  });
}

async function createClassroom({ name, academicYear }, db) {
  return getDb(db).classroom.create({
    data: { name, academicYear },
  });
}

async function restoreArchivedClassroom(id, db) {
  return getDb(db).classroom.update({
    where: { id },
    data: { isArchived: false },
  });
}

async function archiveClassroom(id, db) {
  return getDb(db).classroom.update({
    where: { id },
    data: { isArchived: true },
  });
}

async function countActiveEnrollmentsForClassroom(classroomId, db) {
  return getDb(db).enrollment.count({
    where: { classroomId, isActive: true },
  });
}

async function findStudentById(studentId, db) {
  return getDb(db).student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });
}

async function listClassroomStudentsPage(
  { classroomId, page = 1, limit = 20, search = null },
  db,
) {
  const skip = (page - 1) * limit;
  const where = {
    enrollments: {
      some: {
        classroomId,
        isActive: true,
      },
    },
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { user: { username: { contains: search, mode: "insensitive" } } },
            { user: { phone: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const prismaClient = getDb(db);
  const [students, total] = await Promise.all([
    prismaClient.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: {
          select: {
            username: true,
            phone: true,
          },
        },
      },
    }),
    prismaClient.student.count({ where }),
  ]);

  return {
    students,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function listActiveEnrollmentsWithStudentPreview(classroomId, db) {
  return getDb(db).enrollment.findMany({
    where: { classroomId, isActive: true },
    select: {
      id: true,
      studentId: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { username: true } },
        },
      },
    },
  });
}

async function listActiveEnrollmentLinksByClassroom(classroomId, db) {
  return getDb(db).enrollment.findMany({
    where: {
      classroomId,
      isActive: true,
    },
    select: { id: true, studentId: true },
  });
}

async function deactivateEnrollmentsByIds(enrollmentIds, endedAt, db) {
  if (!enrollmentIds.length) return { count: 0 };

  return getDb(db).enrollment.updateMany({
    where: { id: { in: enrollmentIds } },
    data: {
      isActive: false,
      endDate: endedAt,
    },
  });
}

async function deactivateActiveEnrollmentsByStudentIds(studentIds, endedAt, db) {
  if (!studentIds.length) return { count: 0 };

  return getDb(db).enrollment.updateMany({
    where: {
      studentId: { in: studentIds },
      isActive: true,
    },
    data: {
      isActive: false,
      endDate: endedAt,
    },
  });
}

async function createActiveEnrollments({ studentIds, classroomId, startedAt }, db) {
  if (!studentIds.length) return { count: 0 };

  return getDb(db).enrollment.createMany({
    data: studentIds.map((studentId) => ({
      studentId,
      classroomId,
      startDate: startedAt,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

async function deactivateStudentEnrollmentInClassroom(
  { classroomId, studentId, endedAt },
  db,
) {
  return getDb(db).enrollment.updateMany({
    where: {
      classroomId,
      studentId,
      isActive: true,
    },
    data: {
      isActive: false,
      endDate: endedAt,
    },
  });
}

module.exports = {
  listActiveClassrooms,
  listDistinctActiveAcademicYears,
  listActiveClassroomsByAcademicYear,
  findClassroomById,
  findClassroomByNameAndAcademicYear,
  findClassroomsByNamesAndAcademicYear,
  createClassroom,
  restoreArchivedClassroom,
  archiveClassroom,
  countActiveEnrollmentsForClassroom,
  findStudentById,
  listClassroomStudentsPage,
  listActiveEnrollmentsWithStudentPreview,
  listActiveEnrollmentLinksByClassroom,
  deactivateEnrollmentsByIds,
  deactivateActiveEnrollmentsByStudentIds,
  createActiveEnrollments,
  deactivateStudentEnrollmentInClassroom,
};
