const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const {
  parseSanaOrToday,
  buildRangeByType,
  localTodayIsoDate,
} = require("../../utils/attendancePeriod");

const HAFTA_KUNLARI = [
  "DUSHANBA",
  "SESHANBA",
  "CHORSHANBA",
  "PAYSHANBA",
  "JUMA",
  "SHANBA",
];

function parseIntSafe(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function haftaKuniFromDate(sana) {
  const jsDay = sana.getUTCDay(); // 0 yakshanba ... 6 shanba
  if (jsDay === 0) return null;
  return HAFTA_KUNLARI[jsDay - 1];
}

function nextDay(date) {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

function parseTimeToHoursMinutes(value) {
  const [hoursRaw, minutesRaw] = String(value || "").split(":");
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function createDarsDateTimeUTC(sana, boshlanishVaqti) {
  const parsed = parseTimeToHoursMinutes(boshlanishVaqti);
  if (!parsed) return null;
  return new Date(
    Date.UTC(
      sana.getUTCFullYear(),
      sana.getUTCMonth(),
      sana.getUTCDate(),
      parsed.hours,
      parsed.minutes,
      0,
      0,
    ),
  );
}

function ensureDateMatchesLessonDay(sana, darsHaftaKuni) {
  const kiritilganKun = haftaKuniFromDate(sana);
  if (!kiritilganKun || kiritilganKun !== darsHaftaKuni) {
    throw new ApiError(
      400,
      "DARS_SANA_NOMOS",
      `Bu dars ${darsHaftaKuni} kuniga tegishli. Sana va dars kuni mos emas.`,
    );
  }
}

function findStudentPrimaryBaho(baholar, studentId) {
  const studentBaholari = baholar.filter(
    (item) => item.studentId === studentId,
  );
  if (!studentBaholari.length) return null;
  return (
    studentBaholari.find((item) => item.turi === "JORIY") || studentBaholari[0]
  );
}

async function getTeacherByUserId(userId) {
  return prisma.teacher.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true },
  });
}

async function getTeacherDarslar(req, res) {
  const { sana } = parseSanaOrToday(req.query.sana);
  const haftaKuni = haftaKuniFromDate(sana);
  const requestedOquvYili = req.query.oquvYili?.trim();

  const teacher = await getTeacherByUserId(req.user.sub);
  if (!teacher) {
    throw new ApiError(404, "OQITUVCHI_TOPILMADI", "Teacher topilmadi");
  }

  const oquvYiliRows = await prisma.darsJadvali.findMany({
    where: { oqituvchiId: teacher.id },
    select: { oquvYili: true },
    distinct: ["oquvYili"],
    orderBy: { oquvYili: "desc" },
  });
  const oquvYillar = [
    ...new Set(
      oquvYiliRows.map((row) => row.oquvYili?.trim()).filter(Boolean),
    ),
  ];
  const oquvYili = requestedOquvYili || oquvYillar[0] || "";

  if (!haftaKuni) {
    return res.json({
      ok: true,
      sana: sana.toISOString().slice(0, 10),
      haftaKuni: null,
      oquvYili,
      oquvYillar,
      teacher,
      darslar: [],
    });
  }

  const darslar = await prisma.darsJadvali.findMany({
    where: {
      oqituvchiId: teacher.id,
      haftaKuni,
      ...(oquvYili ? { oquvYili } : {}),
    },
    include: {
      sinf: {
        select: {
          id: true,
          name: true,
          academicYear: true,
          enrollments: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      },
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
      davomatlar: {
        where: {
          sana: {
            gte: sana,
            lt: nextDay(sana),
          },
        },
        select: { id: true, holat: true },
      },
    },
    orderBy: { vaqtOraliq: { tartib: "asc" } },
  });

  const mapped = darslar.map((item) => {
    const jami = item.sinf.enrollments.length;
    return {
      id: item.id,
      sinf: {
        id: item.sinf.id,
        name: item.sinf.name,
        academicYear: item.sinf.academicYear,
      },
      fan: item.fan,
      vaqtOraliq: item.vaqtOraliq,
      jamiStudent: jami,
      belgilangan: item.davomatlar.length,
    };
  });

  res.json({
    ok: true,
    sana: sana.toISOString().slice(0, 10),
    haftaKuni,
    oquvYili,
    oquvYillar,
    teacher,
    darslar: mapped,
  });
}

async function getDarsDavomati(req, res) {
  const { sana } = parseSanaOrToday(req.query.sana);
  const { darsId } = req.params;

  const teacher = await getTeacherByUserId(req.user.sub);
  if (!teacher) {
    throw new ApiError(404, "OQITUVCHI_TOPILMADI", "Teacher topilmadi");
  }

  const dars = await prisma.darsJadvali.findFirst({
    where: {
      id: darsId,
      oqituvchiId: teacher.id,
    },
    include: {
      sinf: {
        select: {
          id: true,
          name: true,
          academicYear: true,
          enrollments: {
            where: { isActive: true },
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  user: { select: { username: true } },
                },
              },
            },
          },
        },
      },
      fan: { select: { id: true, name: true } },
      vaqtOraliq: {
        select: {
          id: true,
          nomi: true,
          boshlanishVaqti: true,
          tugashVaqti: true,
        },
      },
      davomatlar: {
        where: {
          sana: {
            gte: sana,
            lt: nextDay(sana),
          },
        },
        select: {
          id: true,
          studentId: true,
          holat: true,
          izoh: true,
        },
      },
      baholar: {
        where: {
          sana: {
            gte: sana,
            lt: nextDay(sana),
          },
        },
        select: {
          id: true,
          studentId: true,
          turi: true,
          ball: true,
          maxBall: true,
          izoh: true,
        },
      },
    },
  });

  if (!dars) {
    throw new ApiError(
      404,
      "DARS_TOPILMADI",
      "Bu dars sizga tegishli emas yoki topilmadi",
    );
  }
  ensureDateMatchesLessonDay(sana, dars.haftaKuni);

  const davomatMap = new Map(
    dars.davomatlar.map((item) => [item.studentId, item]),
  );
  const students = dars.sinf.enrollments.map((enrollment) => {
    const mark = davomatMap.get(enrollment.studentId);
    const baho = findStudentPrimaryBaho(dars.baholar, enrollment.studentId);
    return {
      id: enrollment.student.id,
      fullName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      username: enrollment.student.user?.username || "",
      holat: mark?.holat || "KELDI",
      izoh: mark?.izoh || "",
      belgilangan: Boolean(mark),
      bahoBall: baho?.ball ?? null,
      bahoMaxBall: baho?.maxBall ?? 5,
      bahoTuri: baho?.turi ?? "JORIY",
      bahoIzoh: baho?.izoh || "",
      baholangan: Boolean(baho),
    };
  });

  res.json({
    ok: true,
    sana: sana.toISOString().slice(0, 10),
    dars: {
      id: dars.id,
      haftaKuni: dars.haftaKuni,
      fan: dars.fan,
      sinf: {
        id: dars.sinf.id,
        name: dars.sinf.name,
        academicYear: dars.sinf.academicYear,
      },
      vaqtOraliq: dars.vaqtOraliq,
    },
    students,
  });
}

async function saveDarsDavomati(req, res) {
  const { darsId } = req.params;
  const { sana: sanaStr, davomatlar } = req.body;
  const { sana } = parseSanaOrToday(sanaStr);
  const todayStr = localTodayIsoDate();
  if (sanaStr > todayStr) {
    throw new ApiError(
      400,
      "KELAJAK_SANA_MUMKIN_EMAS",
      "Kelajak sana uchun davomat yoki baho saqlab bo'lmaydi",
    );
  }

  const teacher = await getTeacherByUserId(req.user.sub);
  if (!teacher) {
    throw new ApiError(404, "OQITUVCHI_TOPILMADI", "Teacher topilmadi");
  }

  const dars = await prisma.darsJadvali.findFirst({
    where: { id: darsId, oqituvchiId: teacher.id },
    select: {
      id: true,
      sinfId: true,
      haftaKuni: true,
      vaqtOraliq: { select: { boshlanishVaqti: true } },
    },
  });

  if (!dars) {
    throw new ApiError(
      404,
      "DARS_TOPILMADI",
      "Bu dars sizga tegishli emas yoki topilmadi",
    );
  }
  ensureDateMatchesLessonDay(sana, dars.haftaKuni);

  const darsBoshlanishSana = createDarsDateTimeUTC(
    sana,
    dars.vaqtOraliq?.boshlanishVaqti,
  );
  if (darsBoshlanishSana) {
    const tahrirMuddatOxiri = new Date(
      darsBoshlanishSana.getTime() + 24 * 60 * 60 * 1000,
    );
    if (new Date() > tahrirMuddatOxiri) {
      throw new ApiError(
        403,
        "DAVOMAT_YOPILGAN",
        "Bu dars davomatini tahrirlash muddati tugagan (24 soatdan oshgan)",
      );
    }
  }

  const activeEnrollments = await prisma.enrollment.findMany({
    where: { classroomId: dars.sinfId, isActive: true },
    select: { studentId: true },
  });
  const activeStudentIds = new Set(
    activeEnrollments.map((item) => item.studentId),
  );

  const invalidStudent = davomatlar.find(
    (item) => !activeStudentIds.has(item.studentId),
  );
  if (invalidStudent) {
    throw new ApiError(
      400,
      "SINF_STUDENT_NOMOS",
      "Yuborilgan studentlardan biri bu sinfga tegishli emas",
    );
  }

  const ops = davomatlar.map((item) => {
    const queries = [
      prisma.davomat.upsert({
        where: {
          darsJadvaliId_studentId_sana: {
            darsJadvaliId: darsId,
            studentId: item.studentId,
            sana,
          },
        },
        create: {
          darsJadvaliId: darsId,
          studentId: item.studentId,
          belgilaganTeacherId: teacher.id,
          sana,
          holat: item.holat,
          izoh: item.izoh || null,
        },
        update: {
          holat: item.holat,
          izoh: item.izoh || null,
          belgilaganTeacherId: teacher.id,
        },
      }),
    ];

    if (
      item.bahoBall !== undefined &&
      item.bahoMaxBall !== undefined &&
      item.bahoTuri !== undefined
    ) {
      queries.push(
        prisma.baho.upsert({
          where: {
            darsJadvaliId_studentId_sana_turi: {
              darsJadvaliId: darsId,
              studentId: item.studentId,
              sana,
              turi: item.bahoTuri,
            },
          },
          create: {
            darsJadvaliId: darsId,
            studentId: item.studentId,
            teacherId: teacher.id,
            sana,
            turi: item.bahoTuri,
            ball: item.bahoBall,
            maxBall: item.bahoMaxBall,
            izoh: item.bahoIzoh || null,
          },
          update: {
            teacherId: teacher.id,
            ball: item.bahoBall,
            maxBall: item.bahoMaxBall,
            izoh: item.bahoIzoh || null,
          },
        }),
      );
    }

    return queries;
  });

  await prisma.$transaction(ops.flat());

  res.json({
    ok: true,
    message: req.t("messages.ATTENDANCE_SAVED"),
    sana: sana.toISOString().slice(0, 10),
    count: davomatlar.length,
  });
}

function groupTeacherSessions(records) {
  const map = new Map();
  for (const row of records) {
    const sanaKey = row.sana.toISOString().slice(0, 10);
    const key = `${row.darsJadvaliId}__${sanaKey}`;
    if (!map.has(key)) {
      map.set(key, {
        darsJadvaliId: row.darsJadvaliId,
        sana: sanaKey,
        sinf: row.darsJadvali?.sinf
          ? `${row.darsJadvali.sinf.name} (${row.darsJadvali.sinf.academicYear})`
          : "-",
        fan: row.darsJadvali?.fan?.name || "-",
        vaqtOraliq: row.darsJadvali?.vaqtOraliq
          ? `${row.darsJadvali.vaqtOraliq.nomi} (${row.darsJadvali.vaqtOraliq.boshlanishVaqti})`
          : "-",
        holatlar: { KELDI: 0, KECHIKDI: 0, SABABLI: 0, SABABSIZ: 0 },
        jami: 0,
      });
    }
    const session = map.get(key);
    session.jami += 1;
    session.holatlar[row.holat] += 1;
  }

  return [...map.values()].sort((a, b) => {
    if (a.sana === b.sana) return a.sinf.localeCompare(b.sinf, "uz");
    return a.sana < b.sana ? 1 : -1;
  });
}

async function getTeacherAttendanceHistory(req, res) {
  const { sana, sanaStr } = parseSanaOrToday(req.query.sana);
  const { classroomId, holat } = req.query;
  const period = buildRangeByType(req.query.periodType, sana);
  const page = parseIntSafe(req.query.page, 1);
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;

  const teacher = await getTeacherByUserId(req.user.sub);
  if (!teacher) {
    throw new ApiError(404, "OQITUVCHI_TOPILMADI", "Teacher topilmadi");
  }

  const baseWhere = {
    sana: { gte: period.from, lt: period.to },
    holat: holat || undefined,
    darsJadvali: {
      oqituvchiId: teacher.id,
      ...(classroomId ? { sinfId: classroomId } : {}),
    },
  };

  const [allSessionKeys, pagedSessions, totalDavomatYozuvlari] =
    await prisma.$transaction([
      prisma.davomat.groupBy({
        where: baseWhere,
        by: ["darsJadvaliId", "sana"],
      }),
      prisma.davomat.groupBy({
        where: baseWhere,
        by: ["darsJadvaliId", "sana"],
        _count: { _all: true },
        orderBy: [{ sana: "desc" }, { darsJadvaliId: "asc" }],
        skip,
        take: limit,
      }),
      prisma.davomat.count({
        where: baseWhere,
      }),
    ]);
  const totalSessions = allSessionKeys.length;
  const pages = Math.ceil(totalSessions / limit);
  if (!pagedSessions.length) {
    return res.json({
      ok: true,
      sana: sanaStr,
      periodType: period.type,
      page,
      limit,
      total: totalSessions,
      pages,
      period: {
        from: period.from.toISOString().slice(0, 10),
        to: new Date(period.to.getTime() - 1).toISOString().slice(0, 10),
      },
      tarix: [],
      jami: {
        davomatYozuvlari: totalDavomatYozuvlari,
        darsSessiyalari: totalSessions,
      },
    });
  }

  const sessionOrWhere = pagedSessions.map((row) => ({
    darsJadvaliId: row.darsJadvaliId,
    sana: row.sana,
  }));
  const [sessionHolatRows, darslar] = await prisma.$transaction([
    prisma.davomat.groupBy({
      where: {
        ...baseWhere,
        OR: sessionOrWhere,
      },
      by: ["darsJadvaliId", "sana", "holat"],
      _count: { _all: true },
    }),
    prisma.darsJadvali.findMany({
      where: {
        id: { in: [...new Set(pagedSessions.map((row) => row.darsJadvaliId))] },
      },
      select: {
        id: true,
        sinf: { select: { id: true, name: true, academicYear: true } },
        fan: { select: { name: true } },
        vaqtOraliq: { select: { nomi: true, boshlanishVaqti: true } },
      },
    }),
  ]);
  const darsMap = new Map(darslar.map((row) => [row.id, row]));
  const holatMap = new Map();
  for (const row of sessionHolatRows) {
    const key = `${row.darsJadvaliId}__${row.sana.toISOString().slice(0, 10)}`;
    if (!holatMap.has(key)) {
      holatMap.set(key, { KELDI: 0, KECHIKDI: 0, SABABLI: 0, SABABSIZ: 0 });
    }
    holatMap.get(key)[row.holat] = row._count?._all || 0;
  }

  const tarix = pagedSessions.map((row) => {
    const sanaKey = row.sana.toISOString().slice(0, 10);
    const dars = darsMap.get(row.darsJadvaliId);
    const holatlar = holatMap.get(`${row.darsJadvaliId}__${sanaKey}`) || {
      KELDI: 0,
      KECHIKDI: 0,
      SABABLI: 0,
      SABABSIZ: 0,
    };
    return {
      darsJadvaliId: row.darsJadvaliId,
      sana: sanaKey,
      sinf: dars?.sinf
        ? `${dars.sinf.name} (${dars.sinf.academicYear})`
        : "-",
      fan: dars?.fan?.name || "-",
      vaqtOraliq: dars?.vaqtOraliq
        ? `${dars.vaqtOraliq.nomi} (${dars.vaqtOraliq.boshlanishVaqti})`
        : "-",
      holatlar,
      jami: row._count?._all || 0,
    };
  });

  res.json({
    ok: true,
    sana: sanaStr,
    periodType: period.type,
    page,
    limit,
    total: totalSessions,
    pages,
    period: {
      from: period.from.toISOString().slice(0, 10),
      to: new Date(period.to.getTime() - 1).toISOString().slice(0, 10),
    },
    tarix,
    jami: {
      davomatYozuvlari: totalDavomatYozuvlari,
      darsSessiyalari: totalSessions,
    },
  });
}

module.exports = {
  getTeacherDarslar,
  getDarsDavomati,
  saveDarsDavomati,
  getTeacherAttendanceHistory,
};
