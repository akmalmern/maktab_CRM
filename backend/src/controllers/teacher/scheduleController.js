const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");

async function getTeacherByUserId(userId) {
  return prisma.teacher.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true },
  });
}

async function getTeacherHaftalikJadval(req, res) {
  const teacher = await getTeacherByUserId(req.user.sub);
  if (!teacher) {
    throw new ApiError(404, "OQITUVCHI_TOPILMADI", "Teacher topilmadi");
  }

  const oquvYili =
    req.query.oquvYili?.trim() ||
    (await prisma.darsJadvali
      .findFirst({
        where: { oqituvchiId: teacher.id },
        orderBy: { createdAt: "desc" },
        select: { oquvYili: true },
      })
      .then((row) => row?.oquvYili || ""));

  const darslar = await prisma.darsJadvali.findMany({
    where: {
      oqituvchiId: teacher.id,
      ...(oquvYili ? { oquvYili } : {}),
    },
    include: {
      sinf: { select: { id: true, name: true, academicYear: true } },
      fan: { select: { id: true, name: true } },
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
    teacher,
    oquvYili,
    darslar,
  });
}

module.exports = { getTeacherHaftalikJadval };
