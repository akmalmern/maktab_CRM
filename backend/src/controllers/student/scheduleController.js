const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");

async function getStudentHaftalikJadval(req, res) {
  const student = await prisma.student.findUnique({
    where: { userId: req.user.sub },
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

  const sinfId = activeEnrollment.classroom.id;
  const requestedYear = req.query.oquvYili?.trim();
  const classroomAcademicYear = activeEnrollment.classroom.academicYear?.trim();
  const oquvYiliRows = await prisma.darsJadvali.findMany({
    where: { sinfId },
    select: { oquvYili: true },
    distinct: ["oquvYili"],
    orderBy: { oquvYili: "desc" },
  });
  const oquvYillar = [
    ...new Set([
      classroomAcademicYear,
      ...oquvYiliRows.map((row) => row.oquvYili?.trim()).filter(Boolean),
    ]),
  ].filter(Boolean);
  const oquvYili =
    requestedYear ||
    classroomAcademicYear ||
    oquvYillar[0] ||
    "";

  const darslar = await prisma.darsJadvali.findMany({
    where: {
      sinfId,
      ...(oquvYili ? { oquvYili } : {}),
    },
    include: {
      fan: { select: { id: true, name: true } },
      oqituvchi: { select: { id: true, firstName: true, lastName: true } },
      vaqtOraliq: {
        select: {
          id: true,
          nomi: true,
          boshlanishVaqti: true,
          tugashVaqti: true,
          tartib: true,
        },
      },
    },
    orderBy: [{ haftaKuni: "asc" }, { vaqtOraliq: { tartib: "asc" } }],
  });

  res.json({
    ok: true,
    oquvYili,
    oquvYillar,
    student: {
      id: student.id,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
      sinf: activeEnrollment.classroom,
    },
    darslar,
  });
}

module.exports = { getStudentHaftalikJadval };
