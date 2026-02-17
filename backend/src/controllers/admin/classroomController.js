const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { cleanOptional } = require("./helpers");

async function getClassrooms(_req, res) {
  const classrooms = await prisma.classroom.findMany({
    where: { isArchived: false },
    orderBy: [{ academicYear: "desc" }, { name: "asc" }],
    include: {
      enrollments: {
        where: { isActive: true },
        include: {
          student: {
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
          },
        },
      },
    },
  });

  const items = classrooms.map((classroom) => {
    const students = classroom.enrollments
      .map((enrollment) => enrollment.student)
      .sort((a, b) => {
        const byFirst = a.firstName.localeCompare(b.firstName, "uz");
        if (byFirst !== 0) return byFirst;
        return a.lastName.localeCompare(b.lastName, "uz");
      });

    return {
      id: classroom.id,
      name: classroom.name,
      academicYear: classroom.academicYear,
      isArchived: classroom.isArchived,
      createdAt: classroom.createdAt,
      updatedAt: classroom.updatedAt,
      studentCount: students.length,
      students,
    };
  });

  res.json({ ok: true, classrooms: items });
}

async function createClassroom(req, res) {
  const name = cleanOptional(req.body.name);
  const academicYear = cleanOptional(req.body.academicYear);
  if (!name || !academicYear) {
    throw new ApiError(400, "VALIDATION_ERROR", "name va academicYear majburiy");
  }

  const existing = await prisma.classroom.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      academicYear: { equals: academicYear, mode: "insensitive" },
    },
    select: { id: true, isArchived: true },
  });

  if (existing && !existing.isArchived) {
    throw new ApiError(409, "CLASSROOM_EXISTS", "Bunday sinf allaqachon mavjud");
  }

  if (existing?.isArchived) {
    const restored = await prisma.classroom.update({
      where: { id: existing.id },
      data: { isArchived: false },
    });
    return res.status(201).json({ ok: true, classroom: restored });
  }

  const classroom = await prisma.classroom.create({
    data: { name, academicYear },
  });
  return res.status(201).json({ ok: true, classroom });
}

async function deleteClassroom(req, res) {
  const { id } = req.params;

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    select: { id: true, isArchived: true },
  });
  if (!classroom) throw new ApiError(404, "CLASSROOM_NOT_FOUND", "Sinf topilmadi");
  if (classroom.isArchived) return res.json({ ok: true });

  const activeEnrollments = await prisma.enrollment.count({
    where: { classroomId: id, isActive: true },
  });
  if (activeEnrollments > 0) {
    throw new ApiError(
      409,
      "CLASSROOM_IN_USE",
      "Bu sinfga faol studentlar biriktirilgan, o'chirib bo'lmaydi",
    );
  }

  await prisma.classroom.update({
    where: { id },
    data: { isArchived: true },
  });
  res.json({ ok: true });
}

module.exports = { getClassrooms, createClassroom, deleteClassroom };
