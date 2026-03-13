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

function normalizeChargeableMonths(rawMonths, fallbackCount = 10) {
  const unique = Array.from(
    new Set(
      (Array.isArray(rawMonths) ? rawMonths : [])
        .map((m) => Number.parseInt(String(m), 10))
        .filter((m) => Number.isFinite(m) && m >= 1 && m <= 12),
    ),
  );
  if (unique.length) return unique;
  const fallback = Number.parseInt(String(fallbackCount || 10), 10);
  if (!Number.isFinite(fallback) || fallback < 1) return null;
  const ordered = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];
  return ordered.slice(0, Math.min(fallback, 12));
}

function readChargeableMonthsFromSettings(settings) {
  return normalizeChargeableMonths(
    settings?.billingCalendar?.chargeableMonths,
    settings?.tolovOylarSoni,
  );
}

function chunkArray(rows, size = 500) {
  const chunkSize = Math.max(1, Number(size) || 500);
  const chunks = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    chunks.push(rows.slice(i, i + chunkSize));
  }
  return chunks;
}

function majburiyatCompositeKey({ studentId, yil, oy }) {
  return `${studentId}:${yil}:${oy}`;
}

function hasMajburiyatChanged(existing, desired) {
  return (
    Number(existing?.bazaSumma || 0) !== Number(desired?.bazaSumma || 0) ||
    Number(existing?.imtiyozSumma || 0) !== Number(desired?.imtiyozSumma || 0) ||
    Number(existing?.netSumma || 0) !== Number(desired?.netSumma || 0) ||
    Number(existing?.tolanganSumma || 0) !== Number(desired?.tolanganSumma || 0) ||
    Number(existing?.qoldiqSumma || 0) !== Number(desired?.qoldiqSumma || 0) ||
    String(existing?.holat || "") !== String(desired?.holat || "") ||
    String(existing?.source || "") !== String(desired?.source || "")
  );
}

async function syncStudentOyMajburiyatlar({
  prismaClient = prisma,
  studentIds,
  oylikSumma,
  futureMonths = 0,
  chargeableMonths = null,
  }) {
  const ids = Array.from(
    new Set((studentIds || []).filter((id) => typeof id === "string" && id)),
  );
  if (!ids.length) return;

  const now = new Date();
  const untilDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + Number(futureMonths || 0), 1),
  );

  const students = await prismaClient.student.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      createdAt: true,
      enrollments: {
        where: { isActive: true },
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { startDate: true },
      },
    },
  });

  if (!students.length) return;

  const normalizedChargeableMonths = Array.isArray(chargeableMonths)
    ? Array.from(
        new Set(
          chargeableMonths
            .map((m) => Number.parseInt(String(m), 10))
            .filter((m) => Number.isFinite(m) && m >= 1 && m <= 12),
        ),
      )
    : null;

  const [qoplamalar, imtiyozlar] = await Promise.all([
    prismaClient.tolovQoplama.findMany({
      where: { studentId: { in: students.map((s) => s.id) } },
      select: { studentId: true, yil: true, oy: true, summa: true },
    }),
    prismaClient.tolovImtiyozi.findMany({
      where: { studentId: { in: students.map((s) => s.id) } },
      select: {
        studentId: true,
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
  ]);

  const paidMap = new Map();
  for (const row of qoplamalar) {
    if (!paidMap.has(row.studentId)) paidMap.set(row.studentId, new Map());
    const key = monthKey(row.yil, row.oy);
    const studentPaidMap = paidMap.get(row.studentId);
    studentPaidMap.set(
      key,
      Number(studentPaidMap.get(key) || 0) + Number(row.summa || 0),
    );
  }

  const imtiyozGrouped = new Map();
  for (const row of imtiyozlar) {
    if (!imtiyozGrouped.has(row.studentId)) imtiyozGrouped.set(row.studentId, []);
    imtiyozGrouped.get(row.studentId).push(row);
  }

  const createRows = [];
  const syncStudentIds = students.map((student) => student.id);

  for (const student of students) {
    const startDate = student.enrollments?.[0]?.startDate || student.createdAt;
    const dueMonths = buildDueMonths(startDate, untilDate);
    if (!dueMonths.length) continue;

    const imtiyozMap = buildImtiyozMonthMap({
      imtiyozlar: imtiyozGrouped.get(student.id) || [],
      oylikSumma,
    });
    const paidAmountMap = paidMap.get(student.id) || new Map();
    const monthRows = [];

    for (const row of dueMonths) {
      if (
        Array.isArray(normalizedChargeableMonths) &&
        normalizedChargeableMonths.length > 0 &&
        !normalizedChargeableMonths.includes(row.oy)
      ) {
        continue;
      }
      const key = monthKey(row.yil, row.oy);
      const baza = Number(oylikSumma || 0);
      const net = Number(imtiyozMap.has(key) ? imtiyozMap.get(key) : baza);
      const imtiyozSumma = Math.max(0, baza - net);
      const rawPaid = Number(paidAmountMap.get(key) || 0);
      const tolanganSumma = Math.max(0, Math.min(net, rawPaid));
      const qoldiqSumma = Math.max(0, net - tolanganSumma);
      let holat = "BELGILANDI";
      if (net <= 0 || qoldiqSumma <= 0) {
        holat = "TOLANGAN";
      } else if (tolanganSumma > 0) {
        holat = "QISMAN_TOLANGAN";
      }

      monthRows.push({
        studentId: student.id,
        yil: row.yil,
        oy: row.oy,
        bazaSumma: baza,
        imtiyozSumma,
        netSumma: net,
        tolanganSumma,
        qoldiqSumma,
        holat,
        source: imtiyozSumma > 0 ? "IMTIYOZ" : "BAZA",
      });
    }
    createRows.push(...monthRows);
  }

  const existingRows = syncStudentIds.length
    ? await prismaClient.studentOyMajburiyat.findMany({
        where: {
          studentId: { in: syncStudentIds },
        },
        select: {
          id: true,
          studentId: true,
          yil: true,
          oy: true,
          bazaSumma: true,
          imtiyozSumma: true,
          netSumma: true,
          tolanganSumma: true,
          qoldiqSumma: true,
          holat: true,
          source: true,
        },
      })
    : [];

  const desiredMap = new Map(
    createRows.map((row) => [majburiyatCompositeKey(row), row]),
  );
  const existingMap = new Map(
    existingRows.map((row) => [majburiyatCompositeKey(row), row]),
  );

  const staleIds = existingRows
    .filter((row) => !desiredMap.has(majburiyatCompositeKey(row)))
    .map((row) => row.id);

  const rowsToCreate = createRows.filter(
    (row) => !existingMap.has(majburiyatCompositeKey(row)),
  );
  const rowsToUpdate = createRows.filter((row) => {
    const existing = existingMap.get(majburiyatCompositeKey(row));
    return existing && hasMajburiyatChanged(existing, row);
  });
  const unchangedCount =
    createRows.length - rowsToCreate.length - rowsToUpdate.length;

  for (const chunk of chunkArray(staleIds, 1000)) {
    if (!chunk.length) continue;
    await prismaClient.studentOyMajburiyat.deleteMany({
      where: {
        id: { in: chunk },
      },
    });
  }

  for (const chunk of chunkArray(rowsToCreate, 1000)) {
    if (!chunk.length) continue;
    await prismaClient.studentOyMajburiyat.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  for (const chunk of chunkArray(rowsToUpdate, 100)) {
    if (!chunk.length) continue;
    await Promise.all(
      chunk.map((row) =>
        prismaClient.studentOyMajburiyat.update({
          where: {
            studentId_yil_oy: {
              studentId: row.studentId,
              yil: row.yil,
              oy: row.oy,
            },
          },
          data: {
            bazaSumma: row.bazaSumma,
            imtiyozSumma: row.imtiyozSumma,
            netSumma: row.netSumma,
            tolanganSumma: row.tolanganSumma,
            qoldiqSumma: row.qoldiqSumma,
            holat: row.holat,
            source: row.source,
          },
        }),
      ),
    );
  }

  return {
    syncedStudents: syncStudentIds.length,
    createdCount: rowsToCreate.length,
    updatedCount: rowsToUpdate.length,
    deletedCount: staleIds.length,
    unchangedCount,
  };
}

async function syncStudentsMajburiyatByMainSettings({
  prismaClient = prisma,
  studentIds,
  futureMonths = 0,
} = {}) {
  const ids = Array.from(
    new Set((studentIds || []).filter((id) => typeof id === "string" && id)),
  );
  if (!ids.length) return { syncedStudents: 0 };

  const settings = await prismaClient.moliyaSozlama.findUnique({
    where: { key: "MAIN" },
    select: {
      oylikSumma: true,
      tolovOylarSoni: true,
      billingCalendar: true,
    },
  });

  const oylikSumma = Number(settings?.oylikSumma || 300000);
  const chargeableMonths = readChargeableMonthsFromSettings(settings);

  const result = await syncStudentOyMajburiyatlar({
    prismaClient,
    studentIds: ids,
    oylikSumma,
    futureMonths,
    chargeableMonths,
  });

  return {
    syncedStudents: ids.length,
    createdCount: Number(result?.createdCount || 0),
    updatedCount: Number(result?.updatedCount || 0),
    deletedCount: Number(result?.deletedCount || 0),
    unchangedCount: Number(result?.unchangedCount || 0),
  };
}

async function syncAllActiveStudentsMajburiyatByMainSettings({
  prismaClient = prisma,
  futureMonths = 0,
} = {}) {
  const students = await prismaClient.student.findMany({
    where: {
      enrollments: {
        some: { isActive: true },
      },
    },
    select: { id: true },
  });
  const ids = students.map((s) => s.id);
  if (!ids.length) return { syncedStudents: 0 };
  return syncStudentsMajburiyatByMainSettings({
    prismaClient,
    studentIds: ids,
    futureMonths,
  });
}

function summarizeDebtFromMajburiyatRows(rows) {
  const allRows = [...(rows || [])].sort(
    (a, b) => monthSerial(a.yil, a.oy) - monthSerial(b.yil, b.oy),
  );
  const dueMonths = allRows.map((r) => ({
    key: monthKey(r.yil, r.oy),
    oySumma: Number(r.netSumma || 0),
    tolanganSumma: Number(r.tolanganSumma || 0),
    qoldiqSumma: Number((r.qoldiqSumma ?? r.netSumma) || 0),
    label: `${r.yil}-${String(r.oy).padStart(2, "0")}`,
    isPaid: r.holat === "TOLANGAN",
    isPartial: r.holat === "QISMAN_TOLANGAN",
  }));
  const debtRows = (rows || []).filter(
    (r) =>
      (r.holat === "BELGILANDI" || r.holat === "QISMAN_TOLANGAN") &&
      Number((r.qoldiqSumma ?? r.netSumma) || 0) > 0,
  );
  const qarzOylar = debtRows
    .map((r) => ({
      key: monthKey(r.yil, r.oy),
      oySumma: Number((r.qoldiqSumma ?? r.netSumma) || 0),
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
  syncStudentsMajburiyatByMainSettings,
  syncAllActiveStudentsMajburiyatByMainSettings,
  summarizeDebtFromMajburiyatRows,
  splitMonthKey,
  monthSerial,
  monthKey,
  monthKeyFromDate,
  readChargeableMonthsFromSettings,
};
