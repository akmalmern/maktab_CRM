const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { getAdminScheduleList } = require("../../services/schedule/scheduleService");

/**
 * Vaqt oraliqlarini olish (masalan 08:30-09:15).
 */
async function getVaqtOraliqlari(_req, res) {
  const vaqtOraliqlari = await prisma.vaqtOraliq.findMany({
    orderBy: { tartib: "asc" },
  });

  res.json({ ok: true, vaqtOraliqlari });
}

/**
 * Yangi vaqt oralig'ini yaratish.
 */
async function createVaqtOraliq(req, res) {
  const { nomi, boshlanishVaqti, tugashVaqti, tartib } = req.body;

  if (boshlanishVaqti >= tugashVaqti) {
    throw new ApiError(
      400,
      "NOTOGRI_VAQT_ORALIGI",
      "boshlanishVaqti tugashVaqtidan kichik bo'lishi kerak",
    );
  }

  const mavjud = await prisma.vaqtOraliq.findFirst({
    where: {
      OR: [{ tartib }, { boshlanishVaqti, tugashVaqti }],
    },
    select: { id: true },
  });

  if (mavjud) {
    throw new ApiError(
      409,
      "VAQT_ORALIQ_MAVJUD",
      "Bu tartib yoki vaqt oralig'i allaqachon mavjud",
    );
  }

  const vaqtOraliq = await prisma.vaqtOraliq.create({
    data: { nomi, boshlanishVaqti, tugashVaqti, tartib },
  });

  res.status(201).json({ ok: true, vaqtOraliq });
}

/**
 * Vaqt oralig'ini o'chirish.
 */
async function deleteVaqtOraliq(req, res) {
  const { id } = req.params;

  const boglanganDars = await prisma.darsJadvali.findFirst({
    where: { vaqtOraliqId: id },
    select: { id: true },
  });
  if (boglanganDars) {
    throw new ApiError(
      409,
      "VAQT_ORALIQ_BAND",
      "Bu vaqt oralig'ida darslar bor, avval darslarni o'chiring",
    );
  }

  await prisma.vaqtOraliq.delete({ where: { id } });
  res.json({ ok: true });
}

/**
 * Dars jadvalini olish (filter bilan).
 */
async function getDarsJadvali(req, res) {
  const { darslar } = await getAdminScheduleList({
    sinfId: req.query.sinfId,
    oqituvchiId: req.query.oqituvchiId,
    oquvYili: req.query.oquvYili,
  });

  res.json({ ok: true, darslar });
}

/**
 * Dars jadvaliga bitta dars qo'shish.
 * Bu joyda ikki xil konflikt tekshiriladi:
 * 1) sinf bir vaqtda band bo'lmasin
 * 2) o'qituvchi bir vaqtda band bo'lmasin
 */
async function createDarsJadvali(req, res) {
  const { sinfId, oqituvchiId, fanId, haftaKuni, vaqtOraliqId, oquvYili } =
    req.body;

  const [sinf, oqituvchi, fan, vaqtOraliq] = await Promise.all([
    prisma.classroom.findUnique({
      where: { id: sinfId },
      select: { id: true, name: true, academicYear: true, isArchived: true },
    }),
    prisma.teacher.findUnique({
      where: { id: oqituvchiId },
      select: { id: true, firstName: true, lastName: true, subjectId: true },
    }),
    prisma.subject.findUnique({
      where: { id: fanId },
      select: { id: true, name: true },
    }),
    prisma.vaqtOraliq.findUnique({
      where: { id: vaqtOraliqId },
      select: { id: true, nomi: true, boshlanishVaqti: true },
    }),
  ]);

  if (!sinf || sinf.isArchived) {
    throw new ApiError(404, "SINF_TOPILMADI", "Tanlangan sinf topilmadi");
  }
  if (!oqituvchi) {
    throw new ApiError(
      404,
      "OQITUVCHI_TOPILMADI",
      "Tanlangan o'qituvchi topilmadi",
    );
  }
  if (!fan) {
    throw new ApiError(404, "FAN_TOPILMADI", "Tanlangan fan topilmadi");
  }
  if (oqituvchi.subjectId !== fanId) {
    throw new ApiError(
      400,
      "OQITUVCHI_FAN_NOMOS",
      "Tanlangan o'qituvchi bu fanni o'tmaydi. Shu fanga mos o'qituvchini tanlang.",
    );
  }
  if (!vaqtOraliq) {
    throw new ApiError(
      404,
      "VAQT_ORALIQ_TOPILMADI",
      "Tanlangan vaqt oralig'i topilmadi",
    );
  }

  const [sinfKonflikt, oqituvchiKonflikt] = await Promise.all([
    prisma.darsJadvali.findFirst({
      where: { sinfId, haftaKuni, vaqtOraliqId, oquvYili },
      include: {
        fan: { select: { name: true } },
        oqituvchi: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.darsJadvali.findFirst({
      where: { oqituvchiId, haftaKuni, vaqtOraliqId, oquvYili },
      include: {
        sinf: { select: { name: true } },
        fan: { select: { name: true } },
      },
    }),
  ]);

  if (sinfKonflikt) {
    throw new ApiError(
      409,
      "SINF_VAQT_BAND",
      `${sinf.name} sinf uchun ${haftaKuni} ${vaqtOraliq.boshlanishVaqti} da boshqa dars bor`,
      {
        mavjudFan: sinfKonflikt.fan?.name,
        mavjudOqituvchi:
          `${sinfKonflikt.oqituvchi?.firstName || ""} ${sinfKonflikt.oqituvchi?.lastName || ""}`.trim(),
      },
    );
  }

  if (oqituvchiKonflikt) {
    const oqituvchiFio = `${oqituvchi.firstName} ${oqituvchi.lastName}`.trim();
    const konfliktSinf = oqituvchiKonflikt.sinf?.name || "Boshqa";
    throw new ApiError(
      409,
      "OQITUVCHI_VAQT_BAND",
      `${oqituvchiFio} uchun ${haftaKuni} ${vaqtOraliq.boshlanishVaqti} da ${konfliktSinf} Sinfda dars bor`,
      {
        oqituvchi: oqituvchiFio,
        sinf: oqituvchiKonflikt.sinf?.name,
        fan: oqituvchiKonflikt.fan?.name,
      },
    );
  }

  const dars = await prisma.darsJadvali.create({
    data: { sinfId, oqituvchiId, fanId, haftaKuni, vaqtOraliqId, oquvYili },
    include: {
      sinf: { select: { id: true, name: true } },
      oqituvchi: { select: { id: true, firstName: true, lastName: true } },
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
  });

  res.status(201).json({ ok: true, dars });
}

/**
 * Dars jadvalidan darsni o'chirish.
 */
async function deleteDarsJadvali(req, res) {
  const { id } = req.params;
  await prisma.darsJadvali.delete({ where: { id } });
  res.json({ ok: true });
}

/**
 * Darsni boshqa katakka ko'chirish yoki maydonlarini yangilash.
 * Drag&drop aynan shu endpointni ishlatadi.
 */
async function updateDarsJadvali(req, res) {
  const { id } = req.params;
  const mavjud = await prisma.darsJadvali.findUnique({
    where: { id },
    include: {
      sinf: { select: { name: true, isArchived: true } },
      oqituvchi: { select: { firstName: true, lastName: true } },
      vaqtOraliq: { select: { boshlanishVaqti: true } },
    },
  });
  if (!mavjud) {
    throw new ApiError(404, "DARS_TOPILMADI", "Dars topilmadi");
  }

  const next = {
    sinfId: req.body.sinfId ?? mavjud.sinfId,
    oqituvchiId: req.body.oqituvchiId ?? mavjud.oqituvchiId,
    fanId: req.body.fanId ?? mavjud.fanId,
    haftaKuni: req.body.haftaKuni ?? mavjud.haftaKuni,
    vaqtOraliqId: req.body.vaqtOraliqId ?? mavjud.vaqtOraliqId,
    oquvYili: req.body.oquvYili ?? mavjud.oquvYili,
  };

  const [sinf, oqituvchi, fan, vaqtOraliq] = await Promise.all([
    prisma.classroom.findUnique({
      where: { id: next.sinfId },
      select: { id: true, name: true, isArchived: true },
    }),
    prisma.teacher.findUnique({
      where: { id: next.oqituvchiId },
      select: { id: true, firstName: true, lastName: true, subjectId: true },
    }),
    prisma.subject.findUnique({
      where: { id: next.fanId },
      select: { id: true, name: true },
    }),
    prisma.vaqtOraliq.findUnique({
      where: { id: next.vaqtOraliqId },
      select: { id: true, boshlanishVaqti: true },
    }),
  ]);

  if (!sinf || sinf.isArchived) {
    throw new ApiError(404, "SINF_TOPILMADI", "Tanlangan sinf topilmadi");
  }
  if (!oqituvchi) {
    throw new ApiError(
      404,
      "OQITUVCHI_TOPILMADI",
      "Tanlangan o'qituvchi topilmadi",
    );
  }
  if (!fan) {
    throw new ApiError(404, "FAN_TOPILMADI", "Tanlangan fan topilmadi");
  }
  if (oqituvchi.subjectId !== next.fanId) {
    throw new ApiError(
      400,
      "OQITUVCHI_FAN_NOMOS",
      "Tanlangan o'qituvchi bu fanni o'tmaydi. Shu fanga mos o'qituvchini tanlang.",
    );
  }
  if (!vaqtOraliq) {
    throw new ApiError(
      404,
      "VAQT_ORALIQ_TOPILMADI",
      "Tanlangan vaqt oralig'i topilmadi",
    );
  }

  const [sinfKonflikt, oqituvchiKonflikt] = await Promise.all([
    prisma.darsJadvali.findFirst({
      where: {
        id: { not: id },
        sinfId: next.sinfId,
        haftaKuni: next.haftaKuni,
        vaqtOraliqId: next.vaqtOraliqId,
        oquvYili: next.oquvYili,
      },
      include: { fan: { select: { name: true } } },
    }),
    prisma.darsJadvali.findFirst({
      where: {
        id: { not: id },
        oqituvchiId: next.oqituvchiId,
        haftaKuni: next.haftaKuni,
        vaqtOraliqId: next.vaqtOraliqId,
        oquvYili: next.oquvYili,
      },
      include: { sinf: { select: { name: true } } },
    }),
  ]);

  if (sinfKonflikt) {
    throw new ApiError(
      409,
      "SINF_VAQT_BAND",
      `${sinf.name} sinf uchun ${next.haftaKuni} ${vaqtOraliq.boshlanishVaqti} band`,
    );
  }
  if (oqituvchiKonflikt) {
    const oqituvchiFio = `${oqituvchi.firstName} ${oqituvchi.lastName}`.trim();
    const konfliktSinf = oqituvchiKonflikt.sinf?.name || "Boshqa";
    throw new ApiError(
      409,
      "OQITUVCHI_VAQT_BAND",
      `${oqituvchiFio} uchun ${next.haftaKuni} ${vaqtOraliq.boshlanishVaqti} da ${konfliktSinf} Sinfda dars bor`,
      {
        oqituvchi: oqituvchiFio,
        sinf: oqituvchiKonflikt.sinf?.name,
      },
    );
  }

  const dars = await prisma.darsJadvali.update({
    where: { id },
    data: next,
    include: {
      sinf: { select: { id: true, name: true } },
      oqituvchi: { select: { id: true, firstName: true, lastName: true } },
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
  });

  res.json({ ok: true, dars });
}

module.exports = {
  getVaqtOraliqlari,
  createVaqtOraliq,
  deleteVaqtOraliq,
  getDarsJadvali,
  createDarsJadvali,
  updateDarsJadvali,
  deleteDarsJadvali,
};
