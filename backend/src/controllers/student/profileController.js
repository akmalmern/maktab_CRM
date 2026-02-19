const prisma = require("../../prisma");
const {
  buildPaidMonthMap,
  buildImtiyozMonthMap,
  buildDebtInfo,
} = require("../../services/financeDebtService");

const DEFAULT_OYLIK_SUMMA = 300000;

function buildDebtMessage(qarzOylarFormatted) {
  if (!qarzOylarFormatted.length) return "";
  if (qarzOylarFormatted.length === 1) {
    return `${qarzOylarFormatted[0]} oyi uchun to'lamagansiz.`;
  }
  return `${qarzOylarFormatted.join(", ")} oylar uchun qarzdorligingiz mavjud.`;
}

async function getMyProfile(req, res) {
  const userId = req.user.sub;
  const [student, settings] = await Promise.all([
    prisma.student.findFirst({
      where: { userId },
      include: {
        user: { select: { username: true, phone: true } },
        enrollments: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            classroom: { select: { id: true, name: true, academicYear: true } },
          },
        },
      },
    }),
    prisma.moliyaSozlama.findUnique({ where: { key: "MAIN" } }),
  ]);

  if (!student) {
    return res.status(404).json({ ok: false, message: "Student topilmadi" });
  }

  const [qoplamalar, imtiyozlar] = await Promise.all([
    prisma.tolovQoplama.findMany({
      where: { studentId: student.id },
      select: { studentId: true, yil: true, oy: true },
    }),
    prisma.tolovImtiyozi.findMany({
      where: { studentId: student.id },
      select: {
        turi: true,
        qiymat: true,
        boshlanishOy: true,
        oylarSoni: true,
        isActive: true,
        bekorQilinganAt: true,
        oylarSnapshot: true,
      },
    }),
  ]);
  const paidSet = buildPaidMonthMap(qoplamalar).get(student.id) || new Set();
  const imtiyozMonthMap = buildImtiyozMonthMap({
    imtiyozlar,
    oylikSumma: settings?.oylikSumma || DEFAULT_OYLIK_SUMMA,
  });
  const debtInfo = buildDebtInfo({
    startDate: student.enrollments?.[0]?.startDate || student.createdAt,
    paidMonthSet: paidSet,
    oylikSumma: settings?.oylikSumma || DEFAULT_OYLIK_SUMMA,
    imtiyozMonthMap,
  });
  const qarzOylarFormatted = debtInfo.qarzOylar.map((m) => m.label);

  res.json({
    ok: true,
    profile: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
      username: student.user?.username || "-",
      classroom: student.enrollments?.[0]?.classroom
        ? {
            id: student.enrollments[0].classroom.id,
            name: student.enrollments[0].classroom.name,
            academicYear: student.enrollments[0].classroom.academicYear,
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
    },
  });
}

module.exports = {
  getMyProfile,
};
