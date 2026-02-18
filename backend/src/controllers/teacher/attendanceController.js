const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { parseSanaOrToday, buildRangeByType } = require("../../utils/attendancePeriod");

const HAFTA_KUNLARI = [
  "DUSHANBA",
  "SESHANBA",
  "CHORSHANBA",
  "PAYSHANBA",
  "JUMA",
  "SHANBA",
];

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
  const studentBaholari = baholar.filter((item) => item.studentId === studentId);
  if (!studentBaholari.length) return null;
  return (
    studentBaholari.find((item) => item.turi === "JORIY") ||
    studentBaholari[0]
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
  if (!haftaKuni) {
    return res.json({ ok: true, sana: sana.toISOString().slice(0, 10), haftaKuni: null, darslar: [] });
  }

  const teacher = await getTeacherByUserId(req.user.sub);
  if (!teacher) {
    throw new ApiError(404, "OQITUVCHI_TOPILMADI", "Teacher topilmadi");
  }

  const darslar = await prisma.darsJadvali.findMany({
    where: {
      oqituvchiId: teacher.id,
      haftaKuni,
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
      vaqtOraliq: { select: { id: true, nomi: true, boshlanishVaqti: true, tugashVaqti: true, tartib: true } },
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
      sinf: { id: item.sinf.id, name: item.sinf.name, academicYear: item.sinf.academicYear },
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
      vaqtOraliq: { select: { id: true, nomi: true, boshlanishVaqti: true, tugashVaqti: true } },
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
    throw new ApiError(404, "DARS_TOPILMADI", "Bu dars sizga tegishli emas yoki topilmadi");
  }
  ensureDateMatchesLessonDay(sana, dars.haftaKuni);

  const davomatMap = new Map(dars.davomatlar.map((item) => [item.studentId, item]));
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
      sinf: { id: dars.sinf.id, name: dars.sinf.name, academicYear: dars.sinf.academicYear },
      vaqtOraliq: dars.vaqtOraliq,
    },
    students,
  });
}

async function saveDarsDavomati(req, res) {
  const { darsId } = req.params;
  const { sana: sanaStr, davomatlar } = req.body;
  const { sana } = parseSanaOrToday(sanaStr);

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
    throw new ApiError(404, "DARS_TOPILMADI", "Bu dars sizga tegishli emas yoki topilmadi");
  }
  ensureDateMatchesLessonDay(sana, dars.haftaKuni);

  const darsBoshlanishSana = createDarsDateTimeUTC(sana, dars.vaqtOraliq?.boshlanishVaqti);
  if (darsBoshlanishSana) {
    const tahrirMuddatOxiri = new Date(darsBoshlanishSana.getTime() + 24 * 60 * 60 * 1000);
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
  const activeStudentIds = new Set(activeEnrollments.map((item) => item.studentId));

  const invalidStudent = davomatlar.find((item) => !activeStudentIds.has(item.studentId));
  if (invalidStudent) {
    throw new ApiError(
      400,
      "SINF_STUDENT_NOMOS",
      "Yuborilgan studentlardan biri bu sinfga tegishli emas",
    );
  }

  const ops = davomatlar.map((item) =>
  {
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
  },
  );

  await prisma.$transaction(ops.flat());

  res.json({
    ok: true,
    message: "Davomat saqlandi",
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
  const { classroomId } = req.query;
  const period = buildRangeByType(req.query.periodType, sana);

  const teacher = await getTeacherByUserId(req.user.sub);
  if (!teacher) {
    throw new ApiError(404, "OQITUVCHI_TOPILMADI", "Teacher topilmadi");
  }

  const records = await prisma.davomat.findMany({
    where: {
      sana: { gte: period.from, lt: period.to },
      darsJadvali: {
        oqituvchiId: teacher.id,
        ...(classroomId ? { sinfId: classroomId } : {}),
      },
    },
    include: {
      darsJadvali: {
        select: {
          id: true,
          sinf: { select: { id: true, name: true, academicYear: true } },
          fan: { select: { name: true } },
          vaqtOraliq: { select: { nomi: true, boshlanishVaqti: true } },
        },
      },
    },
  });

  const tarix = groupTeacherSessions(records);

  res.json({
    ok: true,
    sana: sanaStr,
    periodType: period.type,
    period: {
      from: period.from.toISOString().slice(0, 10),
      to: new Date(period.to.getTime() - 1).toISOString().slice(0, 10),
    },
    tarix,
    jami: {
      davomatYozuvlari: records.length,
      darsSessiyalari: tarix.length,
    },
  });
}

module.exports = {
  getTeacherDarslar,
  getDarsDavomati,
  saveDarsDavomati,
  getTeacherAttendanceHistory,
};
