const prisma = require("../prisma");
const { env } = require("../config/env");
const { ApiError } = require("../utils/apiError");

function isSchemaMismatchError(error) {
  return error?.code === "P2021" || error?.code === "P2022";
}

function normalizeIds(ids) {
  return Array.from(
    new Set(
      (Array.isArray(ids) ? ids : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

function managerScopeEnabled() {
  return Boolean(env.MANAGER_SCOPE_ENFORCED);
}

function throwScopeSchemaError() {
  throw new ApiError(
    500,
    "MANAGER_SCOPE_SCHEMA_MISSING",
    "Manager scope jadvali topilmadi. Migratsiyani ishga tushiring.",
  );
}

async function listManagerClassroomIds({
  managerUserId,
  prismaClient = prisma,
}) {
  if (!managerScopeEnabled()) return null;

  try {
    const rows = await prismaClient.managerClassroomAccess.findMany({
      where: { managerUserId },
      select: { classroomId: true },
    });
    return normalizeIds(rows.map((row) => row.classroomId));
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      throwScopeSchemaError();
    }
    throw error;
  }
}

async function resolveManagerScopedClassroomFilter({
  managerUserId,
  requestedClassroomId = null,
  prismaClient = prisma,
}) {
  const classroomId = String(requestedClassroomId || "").trim() || null;
  if (!managerScopeEnabled()) {
    return {
      enforced: false,
      classroomId,
      classroomIds: null,
    };
  }

  const managerClassroomIds = await listManagerClassroomIds({
    managerUserId,
    prismaClient,
  });

  if (classroomId) {
    if (!managerClassroomIds.includes(classroomId)) {
      throw new ApiError(403, "FORBIDDEN", "Bu sinfga kirish ruxsati yo'q");
    }
    return {
      enforced: true,
      classroomId,
      classroomIds: [classroomId],
    };
  }

  return {
    enforced: true,
    classroomId: null,
    classroomIds: managerClassroomIds,
  };
}

async function ensureManagerCanAccessClassroom({
  managerUserId,
  classroomId,
  managerClassroomIds,
  prismaClient = prisma,
}) {
  const normalizedClassroomId = String(classroomId || "").trim();
  if (!normalizedClassroomId) {
    throw new ApiError(400, "VALIDATION_ERROR", "classroomId majburiy");
  }
  if (!managerScopeEnabled()) return { classroomId: normalizedClassroomId };

  const allowed =
    Array.isArray(managerClassroomIds) && managerClassroomIds.length
      ? normalizeIds(managerClassroomIds)
      : await listManagerClassroomIds({ managerUserId, prismaClient });

  if (!allowed.includes(normalizedClassroomId)) {
    throw new ApiError(403, "FORBIDDEN", "Bu sinfga kirish ruxsati yo'q");
  }

  return {
    classroomId: normalizedClassroomId,
    managerClassroomIds: allowed,
  };
}

async function resolveStudentActiveClassroom({ studentId, prismaClient = prisma }) {
  const student = await prismaClient.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      enrollments: {
        where: { isActive: true },
        orderBy: [{ createdAt: "desc" }],
        take: 1,
        select: { classroomId: true },
      },
    },
  });

  if (!student) {
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  }

  const classroomId = student.enrollments?.[0]?.classroomId || null;
  if (!classroomId) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Student faol sinfga biriktirilmagan yoki ruxsat yo'q",
    );
  }

  return { studentId: student.id, classroomId };
}

async function ensureManagerCanAccessStudent({
  managerUserId,
  studentId,
  managerClassroomIds,
  prismaClient = prisma,
}) {
  if (!managerScopeEnabled()) {
    return resolveStudentActiveClassroom({ studentId, prismaClient });
  }

  const { classroomId } = await resolveStudentActiveClassroom({
    studentId,
    prismaClient,
  });
  await ensureManagerCanAccessClassroom({
    managerUserId,
    classroomId,
    managerClassroomIds,
    prismaClient,
  });

  return { studentId, classroomId };
}

async function listVisibleClassroomsForManager({
  managerUserId,
  includeArchived = false,
  prismaClient = prisma,
}) {
  if (!managerScopeEnabled()) {
    return prismaClient.classroom.findMany({
      where: includeArchived ? undefined : { isArchived: false },
      select: { id: true, name: true, academicYear: true },
      orderBy: [{ name: "asc" }, { academicYear: "desc" }],
    });
  }

  const managerClassroomIds = await listManagerClassroomIds({
    managerUserId,
    prismaClient,
  });

  if (!managerClassroomIds.length) return [];

  return prismaClient.classroom.findMany({
    where: {
      id: { in: managerClassroomIds },
      ...(includeArchived ? {} : { isArchived: false }),
    },
    select: { id: true, name: true, academicYear: true },
    orderBy: [{ name: "asc" }, { academicYear: "desc" }],
  });
}

async function assertManagerUserExists({
  managerUserId,
  prismaClient = prisma,
}) {
  const managerUser = await prismaClient.user.findUnique({
    where: { id: managerUserId },
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
      employee: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  if (!managerUser || managerUser.role !== "MANAGER") {
    throw new ApiError(404, "MANAGER_NOT_FOUND", "Manager topilmadi");
  }

  return managerUser;
}

module.exports = {
  managerScopeEnabled,
  listManagerClassroomIds,
  resolveManagerScopedClassroomFilter,
  ensureManagerCanAccessClassroom,
  ensureManagerCanAccessStudent,
  listVisibleClassroomsForManager,
  assertManagerUserExists,
};
