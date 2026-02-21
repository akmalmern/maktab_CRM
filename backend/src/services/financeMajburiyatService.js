const prisma = require("../prisma");
const {
  monthKeyFromDate,
  buildDueMonths,
  buildImtiyozMonthMap,
} = require("./financeDebtService");

function monthSerial(year, month) {
  return year * 12 + month;
}

function splitMonthKey(key) {
  const [y, m] = String(key || "").split("-");
  const yil = Number.parseInt(y, 10);
  const oy = Number.parseInt(m, 10);
  if (!Number.isFinite(yil) || !Number.isFinite(oy) || oy < 1 || oy > 12) {
    return null;
  }
  return { yil, oy };
}

function monthKey(yil, oy) {
  return `${yil}-${String(oy).padStart(2, "0")}`;
}

async function syncStudentOyMajburiyatlar({
  studentIds,
  oylikSumma,
  futureMonths = 0,
}) {
  const ids = Array.from(
    new Set((studentIds || []).filter((id) => typeof id === "string" && id)),
  );
  if (!ids.length) return;

  const now = new Date();
  const untilDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + Number(futureMonths || 0), 1),
  );

  const students = await prisma.student.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      createdAt: true,
      enrollments: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { startDate: true },
      },
    },
  });

  if (!students.length) return;

  const [qoplamalar, imtiyozlar] = await Promise.all([
    prisma.tolovQoplama.findMany({
      where: { studentId: { in: students.map((s) => s.id) } },
      select: { studentId: true, yil: true, oy: true },
    }),
    prisma.tolovImtiyozi.findMany({
      where: { studentId: { in: students.map((s) => s.id) } },
      select: {
        studentId: true,
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

  const paidMap = new Map();
  for (const row of qoplamalar) {
    if (!paidMap.has(row.studentId)) paidMap.set(row.studentId, new Set());
    paidMap.get(row.studentId).add(monthKey(row.yil, row.oy));
  }

  const imtiyozGrouped = new Map();
  for (const row of imtiyozlar) {
    if (!imtiyozGrouped.has(row.studentId)) imtiyozGrouped.set(row.studentId, []);
    imtiyozGrouped.get(row.studentId).push(row);
  }

  for (const student of students) {
    const startDate = student.enrollments?.[0]?.startDate || student.createdAt;
    const dueMonths = buildDueMonths(startDate, untilDate);
    if (!dueMonths.length) continue;

    const imtiyozMap = buildImtiyozMonthMap({
      imtiyozlar: imtiyozGrouped.get(student.id) || [],
      oylikSumma,
    });
    const paidSet = paidMap.get(student.id) || new Set();

    for (const row of dueMonths) {
      const key = monthKey(row.yil, row.oy);
      const baza = Number(oylikSumma || 0);
      const net = Number(imtiyozMap.has(key) ? imtiyozMap.get(key) : baza);
      const imtiyozSumma = Math.max(0, baza - net);
      const holat =
        paidSet.has(key) || net <= 0 ? "TOLANGAN" : "BELGILANDI";

      await prisma.studentOyMajburiyat.upsert({
        where: {
          studentId_yil_oy: { studentId: student.id, yil: row.yil, oy: row.oy },
        },
        create: {
          studentId: student.id,
          yil: row.yil,
          oy: row.oy,
          bazaSumma: baza,
          imtiyozSumma,
          netSumma: net,
          holat,
          source: imtiyozSumma > 0 ? "IMTIYOZ" : "BAZA",
        },
        update: {
          bazaSumma: baza,
          imtiyozSumma,
          netSumma: net,
          holat,
          source: imtiyozSumma > 0 ? "IMTIYOZ" : "BAZA",
        },
      });
    }
  }
}

function summarizeDebtFromMajburiyatRows(rows) {
  const allRows = [...(rows || [])].sort(
    (a, b) => monthSerial(a.yil, a.oy) - monthSerial(b.yil, b.oy),
  );
  const dueMonths = allRows.map((r) => ({
    key: monthKey(r.yil, r.oy),
    oySumma: Number(r.netSumma || 0),
    label: `${r.yil}-${String(r.oy).padStart(2, "0")}`,
    isPaid: r.holat === "TOLANGAN",
  }));
  const debtRows = (rows || []).filter(
    (r) => r.holat === "BELGILANDI" && Number(r.netSumma || 0) > 0,
  );
  const qarzOylar = debtRows
    .map((r) => ({
      key: monthKey(r.yil, r.oy),
      oySumma: Number(r.netSumma || 0),
      label: `${r.yil}-${String(r.oy).padStart(2, "0")}`,
    }))
    .sort((a, b) => {
      const pa = splitMonthKey(a.key);
      const pb = splitMonthKey(b.key);
      return monthSerial(pa.yil, pa.oy) - monthSerial(pb.yil, pb.oy);
    });

  return {
    dueMonths,
    qarzOylar,
    qarzOylarSoni: qarzOylar.length,
    tolanganOylarSoni: Math.max(dueMonths.length - qarzOylar.length, 0),
    jamiQarzSumma: qarzOylar.reduce((acc, row) => acc + Number(row.oySumma || 0), 0),
    holat: qarzOylar.length ? "QARZDOR" : "TOLAGAN",
  };
}

module.exports = {
  syncStudentOyMajburiyatlar,
  summarizeDebtFromMajburiyatRows,
  splitMonthKey,
  monthSerial,
  monthKey,
  monthKeyFromDate,
};
