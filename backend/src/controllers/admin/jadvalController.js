const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { getAdminScheduleList } = require("../../services/schedule/scheduleService");


function parseTimeToMinutes(value) {
  const [hoursRaw, minutesRaw] = String(value || "").split(":");
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return (hours * 60) + minutes;
}

function getSlotDurationMinutes(vaqtOraliq) {
  const start = parseTimeToMinutes(vaqtOraliq?.boshlanishVaqti);
  const end = parseTimeToMinutes(vaqtOraliq?.tugashVaqti);
  if (start == null || end == null || end <= start) return null;
  return end - start;
}

function minutesToHours(minutes) {
  const hours = Number(minutes || 0) / 60;
  return Math.round(hours * 100) / 100;
}

function mapTeacherWorkloadPlan(plan) {
  if (!plan) return null;
  return {
    id: plan.id,
    teacherId: plan.teacherId,
    oquvYili: plan.oquvYili,
    weeklyMinutesLimit: plan.weeklyMinutesLimit,
    weeklyHoursLimit: minutesToHours(plan.weeklyMinutesLimit),
    note: plan.note || null,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    teacher: plan.teacher
      ? {
          id: plan.teacher.id,
          firstName: plan.teacher.firstName,
          lastName: plan.teacher.lastName,
          subjectId: plan.teacher.subjectId || null,
        }
      : null,
  };
}

async function computeTeacherWeeklyMinutes({
  teacherId,
  oquvYili,
  excludeDarsId = null,
  extraLesson = null,
}) {
  const rows = await prisma.darsJadvali.findMany({
    where: {
      oqituvchiId: teacherId,
      oquvYili,
      ...(excludeDarsId ? { id: { not: excludeDarsId } } : {}),
    },
    include: {
      vaqtOraliq: {
        select: { boshlanishVaqti: true, tugashVaqti: true },
      },
    },
  });
  const lessons = extraLesson ? [...rows, extraLesson] : rows;
  let totalMinutes = 0;
  for (const row of lessons) {
    const duration = getSlotDurationMinutes(row.vaqtOraliq);
    if (!duration) continue;
    totalMinutes += duration;
  }
  return totalMinutes;
}

async function assertTeacherWeeklyWorkloadWithinPlan({
  teacherId,
  oquvYili,
  excludeDarsId = null,
  extraLesson = null,
}) {
  if (extraLesson) {
    const extraDuration = getSlotDurationMinutes(extraLesson.vaqtOraliq);
    if (!extraDuration) {
      throw new ApiError(
        400,
        "VAQT_ORALIQ_NOTOGRI",
        "Tanlangan vaqt oralig'i noto'g'ri",
      );
    }
  }

  const plan = await prisma.teacherWorkloadPlan.findUnique({
    where: {
      teacherId_oquvYili: {
        teacherId,
        oquvYili,
      },
    },
    select: {
      id: true,
      teacherId: true,
      oquvYili: true,
      weeklyMinutesLimit: true,
      note: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!plan) {
    throw new ApiError(
      409,
      "TEACHER_WEEKLY_PLAN_REQUIRED",
      "Bu o'qituvchi uchun tanlangan o'quv yiliga haftalik yuklama belgilanmagan",
      { teacherId, oquvYili },
    );
  }

  const projectedMinutes = await computeTeacherWeeklyMinutes({
    teacherId,
    oquvYili,
    excludeDarsId,
    extraLesson,
  });

  if (projectedMinutes > plan.weeklyMinutesLimit) {
    throw new ApiError(
      409,
      "TEACHER_WEEKLY_HOURS_EXCEEDED",
      "O'qituvchi uchun haftalik yuklama limiti oshib ketmoqda",
      {
        teacherId,
        oquvYili,
        projectedWeeklyMinutes: projectedMinutes,
        projectedWeeklyHours: minutesToHours(projectedMinutes),
        limitWeeklyMinutes: plan.weeklyMinutesLimit,
        limitWeeklyHours: minutesToHours(plan.weeklyMinutesLimit),
      },
    );
  }

  return { plan, projectedMinutes };
}

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
 * O'qituvchi yuklama planlarini olish.
 */
async function listTeacherWorkloadPlans(req, res) {
  const where = {};
  if (req.query.oqituvchiId) where.teacherId = req.query.oqituvchiId;
  if (req.query.oquvYili) where.oquvYili = req.query.oquvYili;

  const plans = await prisma.teacherWorkloadPlan.findMany({
    where,
    include: {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          subjectId: true,
        },
      },
    },
    orderBy: [{ oquvYili: "desc" }, { createdAt: "desc" }],
  });

  res.json({ ok: true, plans: plans.map(mapTeacherWorkloadPlan) });
}

/**
 * O'qituvchi yuklama planini yaratish yoki yangilash.
 */
async function upsertTeacherWorkloadPlan(req, res) {
  const { oqituvchiId, oquvYili, weeklyHoursLimit, note } = req.body;

  const teacher = await prisma.teacher.findUnique({
    where: { id: oqituvchiId },
    select: { id: true, firstName: true, lastName: true, subjectId: true },
  });
  if (!teacher) {
    throw new ApiError(
      404,
      "OQITUVCHI_TOPILMADI",
      "Tanlangan o'qituvchi topilmadi",
    );
  }

  const weeklyMinutesLimit = Math.round(Number(weeklyHoursLimit) * 60);
  if (!Number.isFinite(weeklyMinutesLimit) || weeklyMinutesLimit < 15) {
    throw new ApiError(
      400,
      "TEACHER_WEEKLY_HOURS_INVALID",
      "weeklyHoursLimit noto'g'ri",
    );
  }

  const plan = await prisma.teacherWorkloadPlan.upsert({
    where: {
      teacherId_oquvYili: {
        teacherId: oqituvchiId,
        oquvYili,
      },
    },
    update: {
      weeklyMinutesLimit,
      note: note || null,
    },
    create: {
      teacherId: oqituvchiId,
      oquvYili,
      weeklyMinutesLimit,
      note: note || null,
    },
    include: {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          subjectId: true,
        },
      },
    },
  });

  res.json({ ok: true, plan: mapTeacherWorkloadPlan(plan) });
}

/**
 * O'qituvchi yuklama planini o'chirish.
 */
async function deleteTeacherWorkloadPlan(req, res) {
  const { id } = req.params;

  const existing = await prisma.teacherWorkloadPlan.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new ApiError(
      404,
      "TEACHER_WORKLOAD_PLAN_NOT_FOUND",
      "O'qituvchi yuklama plani topilmadi",
    );
  }

  await prisma.teacherWorkloadPlan.delete({ where: { id } });
  res.json({ ok: true });
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
      select: {
        id: true,
        nomi: true,
        boshlanishVaqti: true,
        tugashVaqti: true,
      },
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

  await assertTeacherWeeklyWorkloadWithinPlan({
    teacherId: oqituvchiId,
    oquvYili,
    extraLesson: { haftaKuni, vaqtOraliq },
  });

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
      select: { id: true, boshlanishVaqti: true, tugashVaqti: true },
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

  await assertTeacherWeeklyWorkloadWithinPlan({
    teacherId: next.oqituvchiId,
    oquvYili: next.oquvYili,
    excludeDarsId: id,
    extraLesson: { haftaKuni: next.haftaKuni, vaqtOraliq },
  });

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
  listTeacherWorkloadPlans,
  upsertTeacherWorkloadPlan,
  deleteTeacherWorkloadPlan,
  createDarsJadvali,
  updateDarsJadvali,
  deleteDarsJadvali,
};
