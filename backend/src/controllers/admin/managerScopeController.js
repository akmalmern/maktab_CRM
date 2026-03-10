const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const {
  assertManagerUserExists,
  listManagerClassroomIds,
} = require("../../services/managerScopeService");

function buildManagerFullName(managerUser) {
  const firstName = String(managerUser?.employee?.firstName || "").trim();
  const lastName = String(managerUser?.employee?.lastName || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || managerUser?.username || "-";
}

function mapManager(managerUser, assignedCount = 0) {
  return {
    id: managerUser.id,
    username: managerUser.username,
    fullName: buildManagerFullName(managerUser),
    isActive: Boolean(managerUser.isActive),
    assignedClassroomsCount: Number(assignedCount || 0),
  };
}

function mapClassroom(row) {
  return {
    id: row.id,
    name: row.name,
    academicYear: row.academicYear,
    isArchived: Boolean(row.isArchived),
  };
}

async function listManagers(_req, res) {
  const rows = await prisma.user.findMany({
    where: { role: "MANAGER" },
    select: {
      id: true,
      username: true,
      isActive: true,
      createdAt: true,
      employee: { select: { firstName: true, lastName: true } },
      managerClassroomAccesses: { select: { classroomId: true } },
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  res.json({
    ok: true,
    managers: rows.map((row) =>
      mapManager(row, row.managerClassroomAccesses?.length || 0),
    ),
  });
}

async function getManagerClassroomAccess(req, res) {
  const { managerUserId } = req.params;
  const manager = await assertManagerUserExists({ managerUserId });

  const [assignedClassroomIds, classrooms] = await Promise.all([
    listManagerClassroomIds({ managerUserId }),
    prisma.classroom.findMany({
      select: { id: true, name: true, academicYear: true, isArchived: true },
      orderBy: [{ name: "asc" }, { academicYear: "desc" }],
    }),
  ]);

  const assignedSet = new Set(assignedClassroomIds || []);
  const assignedClassrooms = classrooms
    .filter((row) => assignedSet.has(row.id))
    .map(mapClassroom);
  const availableClassrooms = classrooms
    .filter((row) => !row.isArchived)
    .map(mapClassroom);

  res.json({
    ok: true,
    manager: mapManager(manager, assignedClassrooms.length),
    assignedClassrooms,
    availableClassrooms,
  });
}

async function replaceManagerClassroomAccess(req, res) {
  const { managerUserId } = req.params;
  const requestedClassroomIds = Array.from(
    new Set(
      (Array.isArray(req.body?.classroomIds) ? req.body.classroomIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  );

  const manager = await assertManagerUserExists({ managerUserId });

  const existingClassrooms = requestedClassroomIds.length
    ? await prisma.classroom.findMany({
        where: {
          id: { in: requestedClassroomIds },
          isArchived: false,
        },
        select: { id: true, name: true, academicYear: true, isArchived: true },
      })
    : [];

  if (existingClassrooms.length !== requestedClassroomIds.length) {
    throw new ApiError(
      400,
      "CLASSROOM_NOT_FOUND",
      "Sinf ro'yxatida topilmagan yoki arxivdagi element bor",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.managerClassroomAccess.deleteMany({
      where: { managerUserId },
    });

    if (requestedClassroomIds.length) {
      await tx.managerClassroomAccess.createMany({
        data: requestedClassroomIds.map((classroomId) => ({
          managerUserId,
          classroomId,
        })),
        skipDuplicates: true,
      });
    }
  });

  res.json({
    ok: true,
    manager: mapManager(manager, requestedClassroomIds.length),
    assignedClassrooms: existingClassrooms.map(mapClassroom),
  });
}

module.exports = {
  listManagers,
  getManagerClassroomAccess,
  replaceManagerClassroomAccess,
};
