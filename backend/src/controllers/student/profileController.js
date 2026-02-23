const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const {
  buildPaidMonthAmountMap,
  buildImtiyozMonthMap,
  buildDueMonths,
  formatMonthByParts,
} = require("../../services/financeDebtService");

const DEFAULT_OYLIK_SUMMA = 300000;

function buildDebtMessage(qarzOylarFormatted) {
  if (!qarzOylarFormatted.length) return "";
  if (qarzOylarFormatted.length === 1) {
    return `${qarzOylarFormatted[0]} oyi uchun to'lamagansiz.`;
  }
  return `${qarzOylarFormatted.join(", ")} oylar uchun qarzdorligingiz mavjud.`;
}

function toIsoDate(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function calcFoizFromCounts(total, counts) {
  if (!total) return 0;
  const present = Number(counts.KELDI || 0) + Number(counts.KECHIKDI || 0);
  return Number(((present / total) * 100).toFixed(1));
}

function toMonthSerial(year, month) {
  return year * 12 + month;
}

function buildDebtInfoByEnrollments({
  enrollments,
  paidMonthSet,
  oylikSumma,
  imtiyozMonthMap,
  now = new Date(),
}) {
  const paidMonthAmountMap = paidMonthSet instanceof Map ? paidMonthSet : null;
  const periods = [];
  for (const enrollment of enrollments || []) {
    if (!enrollment?.startDate) continue;
    const from = new Date(enrollment.startDate);
    if (Number.isNaN(from.getTime())) continue;
    let to = now;
    if (!enrollment.isActive) {
      to = enrollment.endDate ? new Date(enrollment.endDate) : from;
    }
    if (Number.isNaN(to.getTime()) || to < from) {
      to = from;
    }
    periods.push({ from, to });
  }

  if (!periods.length) {
    return {
      dueMonths: [],
      dueMonthsCount: 0,
      tolanganOylarSoni: 0,
      qarzOylar: [],
      qarzOylarSoni: 0,
      jamiQarzSumma: 0,
      holat: "TOLAGAN",
    };
  }

  const uniqueDueMap = new Map();
  for (const period of periods) {
    const months = buildDueMonths(period.from, period.to);
    for (const month of months) {
      if (!uniqueDueMap.has(month.key)) {
        uniqueDueMap.set(month.key, month);
      }
    }
  }

  const dueMonths = [...uniqueDueMap.values()].sort((a, b) => {
    return toMonthSerial(a.yil, a.oy) - toMonthSerial(b.yil, b.oy);
  });
  const dueMonthsWithAmount = dueMonths
    .map((m) => ({
      ...m,
      label: formatMonthByParts(m.yil, m.oy),
      oySumma: imtiyozMonthMap.has(m.key)
        ? Number(imtiyozMonthMap.get(m.key) || 0)
        : Number(oylikSumma || 0),
    }))
    .map((m) => {
      const paidAmount = paidMonthAmountMap
        ? Number(paidMonthAmountMap.get(m.key) || 0)
        : paidMonthSet?.has?.(m.key)
          ? Number(m.oySumma || 0)
          : 0;
      const tolanganSumma = Math.max(
        0,
        Math.min(Number(m.oySumma || 0), Number(paidAmount || 0)),
      );
      const qoldiqSumma = Math.max(0, Number(m.oySumma || 0) - tolanganSumma);
      return {
        ...m,
        tolanganSumma,
        qoldiqSumma,
        isPaid: qoldiqSumma <= 0,
        isPartial: qoldiqSumma > 0 && tolanganSumma > 0,
      };
    });
  const qarzOylar = dueMonthsWithAmount.filter(
    (m) => m.qoldiqSumma > 0,
  );

  return {
    dueMonths: dueMonthsWithAmount,
    dueMonthsCount: dueMonthsWithAmount.length,
    tolanganOylarSoni: dueMonthsWithAmount.length - qarzOylar.length,
    qarzOylar,
    qarzOylarSoni: qarzOylar.length,
    jamiQarzSumma: qarzOylar.reduce(
      (sum, row) => sum + Number(row.qoldiqSumma || 0),
      0,
    ),
    holat: qarzOylar.length ? "QARZDOR" : "TOLAGAN",
  };
}

async function getMyProfile(req, res) {
  const userId = req.user.sub;
  const [student, settings] = await Promise.all([
    prisma.student.findFirst({
      where: { userId },
      include: {
        user: { select: { username: true, phone: true } },
        enrollments: {
          orderBy: [{ isActive: "desc" }, { startDate: "asc" }],
          include: {
            classroom: { select: { id: true, name: true, academicYear: true } },
          },
        },
      },
    }),
    prisma.moliyaSozlama.findUnique({ where: { key: "MAIN" } }),
  ]);

  if (!student) {
    throw new ApiError(404, "STUDENT_TOPILMADI", "Student topilmadi");
  }

  const last30Days = new Date();
  last30Days.setUTCDate(last30Days.getUTCDate() - 30);

  const [
    qoplamalar,
    imtiyozlar,
    davomatTotal30Kun,
    davomatGrouped30Kun,
    oxirgiBaholar,
    oxirgiTolovlar,
  ] = await Promise.all([
    prisma.tolovQoplama.findMany({
      where: { studentId: student.id },
      select: { studentId: true, yil: true, oy: true, summa: true },
    }),
    prisma.tolovImtiyozi.findMany({
      where: { studentId: student.id },
      select: {
        turi: true,
        qiymat: true,
        boshlanishYil: true,
        boshlanishOyRaqam: true,
        oylarSoni: true,
        isActive: true,
        bekorQilinganAt: true,
        oylarSnapshot: true,
      },
    }),
    prisma.davomat.count({
      where: {
        studentId: student.id,
        sana: { gte: last30Days },
      },
    }),
    prisma.davomat.groupBy({
      where: {
        studentId: student.id,
        sana: { gte: last30Days },
      },
      by: ["holat"],
      _count: { _all: true },
    }),
    prisma.baho.findMany({
      where: { studentId: student.id },
      orderBy: [{ sana: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        sana: true,
        turi: true,
        ball: true,
        maxBall: true,
        darsJadvali: { select: { fan: { select: { name: true } } } },
      },
    }),
    prisma.tolovTranzaksiya.findMany({
      where: {
        studentId: student.id,
        holat: "AKTIV",
      },
      orderBy: [{ tolovSana: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        turi: true,
        summa: true,
        tolovSana: true,
        qoplamalar: {
          select: { yil: true, oy: true, summa: true },
        },
      },
    }),
  ]);
  const paidSet =
    buildPaidMonthAmountMap(qoplamalar).get(student.id) || new Map();
  const imtiyozMonthMap = buildImtiyozMonthMap({
    imtiyozlar,
    oylikSumma: settings?.oylikSumma || DEFAULT_OYLIK_SUMMA,
  });
  const debtInfo = buildDebtInfoByEnrollments({
    enrollments: student.enrollments || [],
    paidMonthSet: paidSet,
    oylikSumma: settings?.oylikSumma || DEFAULT_OYLIK_SUMMA,
    imtiyozMonthMap,
  });
  const qarzOylarFormatted = debtInfo.qarzOylar.map((m) => m.label);
  const activeEnrollment =
    student.enrollments.find((enrollment) => enrollment.isActive) || null;
  const holatlar30Kun = { KELDI: 0, KECHIKDI: 0, SABABLI: 0, SABABSIZ: 0 };
  for (const row of davomatGrouped30Kun || []) {
    if (row?.holat && holatlar30Kun[row.holat] !== undefined) {
      holatlar30Kun[row.holat] = row._count?._all || 0;
    }
  }
  const davomatFoizi30Kun = calcFoizFromCounts(davomatTotal30Kun, holatlar30Kun);

  res.json({
    ok: true,
    profile: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
      username: student.user?.username || "-",
      classroom: activeEnrollment?.classroom
        ? {
            id: activeEnrollment.classroom.id,
            name: activeEnrollment.classroom.name,
            academicYear: activeEnrollment.classroom.academicYear,
          }
        : null,
      moliya: {
        holat: debtInfo.holat,
        qarzOylarSoni: debtInfo.qarzOylarSoni,
        qarzOylar: debtInfo.qarzOylar.map((m) => m.key),
        qarzOylarFormatted,
        jamiQarzSumma: debtInfo.jamiQarzSumma,
        message: buildDebtMessage(qarzOylarFormatted),
      },
      dashboard: {
        davomat: {
          period: "30_KUN",
          jami: davomatTotal30Kun,
          foiz: davomatFoizi30Kun,
          holatlar: holatlar30Kun,
        },
        oxirgiBaholar: oxirgiBaholar.map((row) => ({
          id: row.id,
          sana: toIsoDate(row.sana),
          turi: row.turi,
          ball: row.ball,
          maxBall: row.maxBall,
          fan: row.darsJadvali?.fan?.name || "-",
        })),
        oxirgiTolovlar: oxirgiTolovlar.map((row) => ({
          id: row.id,
          turi: row.turi,
          summa: row.summa,
          sana: toIsoDate(row.tolovSana),
          qoplanganOylarSoni: Array.isArray(row.qoplamalar)
            ? row.qoplamalar.length
            : 0,
          qoplamaSummalari: Array.isArray(row.qoplamalar)
            ? row.qoplamalar.map((q) => ({
                key: `${q.yil}-${String(q.oy).padStart(2, "0")}`,
                summa: Number(q.summa || 0),
              }))
            : [],
        })),
      },
    },
  });
}

module.exports = {
  getMyProfile,
};
