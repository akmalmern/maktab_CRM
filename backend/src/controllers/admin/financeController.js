const { Prisma } = require("@prisma/client");
const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const {
  formatMonthByParts,
  formatMonthKey,
  monthKeyFromDate,
  buildMonthRange,
  buildPaidMonthMap,
  buildImtiyozMonthMap,
  buildDebtInfo,
} = require("../../services/financeDebtService");
const {
  resolvePaymentMonthCount,
  resolvePaymentAmount,
} = require("../../services/financePaymentService");

const DEFAULT_OYLIK_SUMMA = 300000;
const DEFAULT_YILLIK_SUMMA = 3000000;
const MIN_SUMMA = 50_000;
const MAX_SUMMA = 50_000_000;

function parseIntSafe(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function startOfMonthUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function nextMonthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function resolveTarifStartDate(startType) {
  return nextMonthStart();
}

function safeFormatMonthKey(value) {
  try {
    return formatMonthKey(value);
  } catch {
    return value;
  }
}

function monthKeyToSerial(monthKey) {
  const [yearStr, monthStr] = String(monthKey || "").split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }
  return year * 12 + month;
}

function calculateImtiyozOySumma({ turi, qiymat, oylikSumma }) {
  const base = Number(oylikSumma || 0);
  if (!base) return 0;
  if (turi === "TOLIQ_OZOD") return 0;
  if (turi === "FOIZ") {
    const foiz = Math.max(0, Math.min(100, Number(qiymat || 0)));
    return Math.max(0, Math.round((base * (100 - foiz)) / 100));
  }
  if (turi === "SUMMA") {
    return Math.max(0, base - Number(qiymat || 0));
  }
  return base;
}

function buildImtiyozSnapshotRows({
  turi,
  qiymat,
  boshlanishOy,
  oylarSoni,
  oylikSumma,
}) {
  const months = buildMonthRange(boshlanishOy, Number(oylarSoni || 1));
  return months.map((month) => {
    const key = `${month.yil}-${String(month.oy).padStart(2, "0")}`;
    return {
      key,
      yil: month.yil,
      oy: month.oy,
      oySumma: calculateImtiyozOySumma({
        turi,
        qiymat,
        oylikSumma,
      }),
    };
  });
}

function filterFinanceRowsByQuery(
  rows,
  { status = "ALL", debtMonth = "ALL", debtTargetMonth = null } = {},
) {
  const now = new Date();
  const currentMonthKey = monthKeyFromDate(now);
  const previousMonthKey = monthKeyFromDate(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
  );
  const selectedMonthKey = debtTargetMonth?.key || null;

  return (rows || []).filter((row) => {
    if (status === "QARZDOR" && row.holat !== "QARZDOR") return false;
    if (status === "TOLAGAN" && row.holat !== "TOLAGAN") return false;

    const debtSet = new Set(row.qarzOylar || []);
    if (selectedMonthKey) return debtSet.has(selectedMonthKey);
    if (debtMonth === "CURRENT") return debtSet.has(currentMonthKey);
    if (debtMonth === "PREVIOUS") return debtSet.has(previousMonthKey);
    return true;
  });
}

function mapStudentRowFromRaw(row, debtInfo) {
  const classroom =
    row.classroomName && row.academicYear
      ? `${row.classroomName} (${row.academicYear})`
      : "-";
  const now = new Date();
  const currentMonthKey = monthKeyFromDate(now);
  const previousMonthKey = monthKeyFromDate(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
  );
  const dueMonthMap = new Map(
    (debtInfo.dueMonths || []).map((item) => [item.key, item]),
  );
  const debtMonthMap = new Map(
    (debtInfo.qarzOylar || []).map((item) => [item.key, item]),
  );

  return {
    id: row.id,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    username: row.username || "-",
    phone: row.phone || "-",
    classroom,
    holat: debtInfo.holat,
    qarzOylarSoni: debtInfo.qarzOylarSoni,
    qarzOylar: debtInfo.qarzOylar.map((m) => m.key),
    qarzOylarFormatted: debtInfo.qarzOylar.map((m) => m.label),
    qarzOylarDetal: debtInfo.qarzOylar.map((m) => ({
      key: m.key,
      label: m.label,
      oySumma: Number(m.oySumma || 0),
    })),
    tolanganOylarSoni: debtInfo.tolanganOylarSoni,
    jamiQarzSumma: debtInfo.jamiQarzSumma,
    joriyOyMajburiySumma: Number(
      dueMonthMap.get(currentMonthKey)?.oySumma || 0,
    ),
    joriyOyQarzSumma: Number(debtMonthMap.get(currentMonthKey)?.oySumma || 0),
    oldingiOyQarzSumma: Number(
      debtMonthMap.get(previousMonthKey)?.oySumma || 0,
    ),
  };
}

function mapImtiyozRow(row) {
  const start = String(row.boshlanishOy || "");
  let rangeLabel = safeFormatMonthKey(start);
  const snapshotKeys = Array.isArray(row.oylarSnapshot)
    ? row.oylarSnapshot
        .map((entry) => {
          if (typeof entry?.key === "string") return entry.key;
          if (
            Number.isFinite(Number(entry?.yil)) &&
            Number.isFinite(Number(entry?.oy))
          ) {
            return `${Number(entry.yil)}-${String(Number(entry.oy)).padStart(2, "0")}`;
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => (monthKeyToSerial(a) || 0) - (monthKeyToSerial(b) || 0))
    : [];

  if (snapshotKeys.length > 1) {
    rangeLabel = `${safeFormatMonthKey(snapshotKeys[0])} - ${safeFormatMonthKey(snapshotKeys[snapshotKeys.length - 1])}`;
  } else if (snapshotKeys.length === 1) {
    rangeLabel = safeFormatMonthKey(snapshotKeys[0]);
  } else if (row.oylarSoni > 1) {
    const months = buildMonthRange(start, row.oylarSoni);
    const last = months[months.length - 1];
    const lastKey = `${last.yil}-${String(last.oy).padStart(2, "0")}`;
    rangeLabel = `${safeFormatMonthKey(start)} - ${safeFormatMonthKey(lastKey)}`;
  }

  return {
    id: row.id,
    turi: row.turi,
    qiymat: row.qiymat,
    boshlanishOy: start,
    oylarSoni: row.oylarSoni,
    oylarSnapshot: Array.isArray(row.oylarSnapshot) ? row.oylarSnapshot : [],
    sabab: row.sabab,
    izoh: row.izoh || "",
    isActive: row.isActive,
    davrLabel: rangeLabel,
    createdAt: row.createdAt,
    bekorQilinganAt: row.bekorQilinganAt,
    bekorQilishSababi: row.bekorQilishSababi || "",
  };
}

function buildStudentImtiyozMap(imtiyozRows, oylikSumma) {
  const grouped = new Map();
  for (const row of imtiyozRows || []) {
    if (!grouped.has(row.studentId)) grouped.set(row.studentId, []);
    grouped.get(row.studentId).push(row);
  }

  const map = new Map();
  for (const [studentId, rows] of grouped.entries()) {
    map.set(studentId, buildImtiyozMonthMap({ imtiyozlar: rows, oylikSumma }));
  }
  return map;
}

function buildWhereSql({ search, classroomId }) {
  const whereClauses = [];

  if (search) {
    const term = `%${search}%`;
    whereClauses.push(
      Prisma.sql`(
        s."firstName" ILIKE ${term}
        OR s."lastName" ILIKE ${term}
        OR u."username" ILIKE ${term}
      )`,
    );
  }

  if (classroomId) {
    whereClauses.push(Prisma.sql`ae."classroomId" = ${classroomId}`);
  }

  if (!whereClauses.length) return Prisma.empty;
  return Prisma.sql`WHERE ${Prisma.join(whereClauses, Prisma.sql` AND `)}`;
}

function buildStatusSql(status) {
  // Debt filtering imtiyoz bilan JS qatlamida hisoblanadi.
  return Prisma.empty;
}

function parseDebtTargetMonth(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const [yearStr, monthStr] = raw.split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new ApiError(
      400,
      "INVALID_MONTH",
      "debtTargetMonth formati noto'g'ri: YYYY-MM",
    );
  }
  return {
    key: raw,
    year,
    month,
    startDate: new Date(Date.UTC(year, month - 1, 1)),
  };
}

function buildDebtMonthSql(debtMonth, debtTargetMonth) {
  // DebtMonth filtering imtiyoz bilan JS qatlamida hisoblanadi.
  return Prisma.empty;
}

async function fetchFinancePageRows({
  search,
  classroomId,
  debtTargetMonth,
  page,
  limit,
  settings,
}) {
  const whereSql = buildWhereSql({ search, classroomId });
  const statusSql = buildStatusSql();
  const debtMonthSql = buildDebtMonthSql();
  const offset = (page - 1) * limit;
  const targetYear = debtTargetMonth?.year || null;
  const targetMonth = debtTargetMonth?.month || null;
  const targetStartDate = debtTargetMonth?.startDate || null;

  const rawRows = await prisma.$queryRaw`
    WITH active_enrollment AS (
      SELECT DISTINCT ON (e."studentId")
        e."studentId",
        e."startDate",
        e."classroomId"
      FROM "Enrollment" e
      WHERE e."isActive" = true
      ORDER BY e."studentId", e."createdAt" DESC
    ),
    base AS (
      SELECT
        s.id,
        s."firstName",
        s."lastName",
        s."createdAt",
        u.username,
        u.phone,
        ae."startDate",
        ae."classroomId",
        c.name AS "classroomName",
        c."academicYear",
        COALESCE(pm."paidMonths", 0)::int AS "paidMonths",
        CASE WHEN cm.paid IS NOT NULL THEN true ELSE false END AS "currentMonthPaid",
        CASE WHEN pmx.paid IS NOT NULL THEN true ELSE false END AS "previousMonthPaid",
        CASE WHEN sm.paid IS NOT NULL THEN true ELSE false END AS "selectedMonthPaid"
      FROM "Student" s
      LEFT JOIN "User" u ON u.id = s."userId"
      LEFT JOIN active_enrollment ae ON ae."studentId" = s.id
      LEFT JOIN "Classroom" c ON c.id = ae."classroomId"
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS "paidMonths"
        FROM "TolovQoplama" tq
        WHERE tq."studentId" = s.id
          AND make_date(tq.yil, tq.oy, 1) BETWEEN date_trunc('month', COALESCE(ae."startDate", s."createdAt"))::date
          AND date_trunc('month', CURRENT_DATE)::date
      ) pm ON true
      LEFT JOIN LATERAL (
        SELECT 1 AS paid
        FROM "TolovQoplama" tqm
        WHERE tqm."studentId" = s.id
          AND tqm.yil = EXTRACT(YEAR FROM CURRENT_DATE)::int
          AND tqm.oy = EXTRACT(MONTH FROM CURRENT_DATE)::int
        LIMIT 1
      ) cm ON true
      LEFT JOIN LATERAL (
        SELECT 1 AS paid
        FROM "TolovQoplama" tqp
        WHERE tqp."studentId" = s.id
          AND tqp.yil = EXTRACT(YEAR FROM (date_trunc('month', CURRENT_DATE) - interval '1 month'))::int
          AND tqp.oy = EXTRACT(MONTH FROM (date_trunc('month', CURRENT_DATE) - interval '1 month'))::int
        LIMIT 1
      ) pmx ON true
      LEFT JOIN LATERAL (
        SELECT 1 AS paid
        FROM "TolovQoplama" tqs
        WHERE tqs."studentId" = s.id
          AND tqs.yil = ${targetYear}
          AND tqs.oy = ${targetMonth}
        LIMIT 1
      ) sm ON true
      ${whereSql}
    ),
    calc AS (
      SELECT
        *,
        GREATEST(
          (
            (DATE_PART('year', age(date_trunc('month', CURRENT_DATE), date_trunc('month', COALESCE("startDate", "createdAt")))) * 12)
            + DATE_PART('month', age(date_trunc('month', CURRENT_DATE), date_trunc('month', COALESCE("startDate", "createdAt"))))
            + 1
          )::int,
          0
        ) AS "dueMonths"
      FROM base
    ),
    filtered AS (
      SELECT
        *,
        GREATEST("dueMonths" - "paidMonths", 0) AS "debtMonths",
        CASE
          WHEN date_trunc('month', COALESCE("startDate", "createdAt")) <= date_trunc('month', CURRENT_DATE)
               AND NOT "currentMonthPaid"
          THEN true
          ELSE false
        END AS "thisMonthUnpaid",
        CASE
          WHEN date_trunc('month', COALESCE("startDate", "createdAt")) <= (date_trunc('month', CURRENT_DATE) - interval '1 month')
               AND NOT "previousMonthPaid"
          THEN true
          ELSE false
        END AS "previousMonthUnpaid",
        CASE
          WHEN ${targetStartDate}::date IS NOT NULL
               AND date_trunc('month', COALESCE("startDate", "createdAt")) <= date_trunc('month', ${targetStartDate}::date)
               AND NOT "selectedMonthPaid"
          THEN true
          ELSE false
        END AS "selectedMonthUnpaid"
      FROM calc
    ),
    status_filtered AS (
      SELECT *
      FROM filtered
      ${statusSql}
    ),
    debt_month_filtered AS (
      SELECT *
      FROM status_filtered
      ${debtMonthSql}
    )
    SELECT
      id,
      "firstName",
      "lastName",
      username,
      phone,
      "classroomName",
      "academicYear",
      COALESCE("startDate", "createdAt") AS "startDate",
      COUNT(*) OVER()::int AS "__total"
    FROM debt_month_filtered
    ORDER BY "firstName" ASC, "lastName" ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const total = rawRows[0]?.__total || 0;
  const studentIds = rawRows.map((row) => row.id);
  const qoplamalar = studentIds.length
    ? await prisma.tolovQoplama.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, yil: true, oy: true },
      })
    : [];
  const imtiyozRows = studentIds.length
    ? await prisma.tolovImtiyozi.findMany({
        where: {
          studentId: { in: studentIds },
        },
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
      })
    : [];

  const paidMonthMap = buildPaidMonthMap(qoplamalar);
  const imtiyozMonthMap = buildStudentImtiyozMap(
    imtiyozRows,
    settings.oylikSumma,
  );
  const items = rawRows.map((row) => {
    const paidSet = paidMonthMap.get(row.id) || new Set();
    const debtInfo = buildDebtInfo({
      startDate: row.startDate,
      paidMonthSet: paidSet,
      oylikSumma: settings.oylikSumma,
      imtiyozMonthMap: imtiyozMonthMap.get(row.id) || new Map(),
    });
    return mapStudentRowFromRaw(row, debtInfo);
  });

  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    items,
  };
}

async function fetchFinanceSummary({
  search,
  classroomId,
  status,
  debtMonth,
  debtTargetMonth,
  cashflowMonth,
  settings,
  rows,
}) {
  const sourceRows = Array.isArray(rows)
    ? rows
    : await fetchAllFinanceRows({
        search,
        classroomId,
        settings,
      });
  const now = new Date();
  const currentMonthKey = monthKeyFromDate(now);
  const previousMonthKey = monthKeyFromDate(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
  );
  const selectedMonthKey = debtTargetMonth?.key || null;
  const cashflowMonthKey =
    cashflowMonth?.key || selectedMonthKey || currentMonthKey;
  const cohortRows = sourceRows;

  const debtMonthFiltered = filterFinanceRowsByQuery(sourceRows, {
    status,
    debtMonth,
    debtTargetMonth,
  });

  const totalRows = debtMonthFiltered.length;
  const totalDebtors = debtMonthFiltered.filter(
    (row) => row.holat === "QARZDOR",
  ).length;
  const totalDebtAmount = debtMonthFiltered.reduce(
    (acc, row) => acc + Number(row.jamiQarzSumma || 0),
    0,
  );
  const thisMonthDebtors = debtMonthFiltered.filter((row) =>
    (row.qarzOylar || []).includes(currentMonthKey),
  ).length;
  const previousMonthDebtors = debtMonthFiltered.filter((row) =>
    (row.qarzOylar || []).includes(previousMonthKey),
  ).length;
  const selectedMonthDebtors = selectedMonthKey
    ? debtMonthFiltered.filter((row) =>
        (row.qarzOylar || []).includes(selectedMonthKey),
      ).length
    : 0;

  const thisMonthDebtAmount = debtMonthFiltered.reduce(
    (acc, row) => acc + Number(row.joriyOyQarzSumma || 0),
    0,
  );
  const previousMonthDebtAmount = debtMonthFiltered.reduce(
    (acc, row) => acc + Number(row.oldingiOyQarzSumma || 0),
    0,
  );
  const selectedMonthDebtAmount = selectedMonthKey
    ? debtMonthFiltered.reduce((acc, row) => {
        const detail = (row.qarzOylarDetal || []).find(
          (item) => item.key === selectedMonthKey,
        );
        return acc + Number(detail?.oySumma || 0);
      }, 0)
    : 0;
  const monthlyPlanAmount = debtMonthFiltered.reduce(
    (acc, row) => acc + Number(row.joriyOyMajburiySumma || 0),
    0,
  );

  const parsedCashflowMonth = parseDebtTargetMonth(cashflowMonthKey);
  const cashflowMonthStart = new Date(
    Date.UTC(parsedCashflowMonth.year, parsedCashflowMonth.month - 1, 1),
  );
  const cashflowMonthEnd = new Date(
    Date.UTC(parsedCashflowMonth.year, parsedCashflowMonth.month, 1),
  );
  const cashflowPlanStudentIds = cohortRows.map((row) => row.id);
  let cashflowPlanAmount = 0;
  let cashflowCollectedAmount = 0;

  if (cashflowPlanStudentIds.length) {
    const [planStudents, cashflowImtiyozRows, cashflowPaidAgg] =
      await prisma.$transaction([
        prisma.student.findMany({
          where: { id: { in: cashflowPlanStudentIds } },
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
        }),
        prisma.tolovImtiyozi.findMany({
          where: {
            studentId: { in: cashflowPlanStudentIds },
          },
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
        prisma.tolovTranzaksiya.aggregate({
          where: {
            holat: "AKTIV",
            studentId: { in: cashflowPlanStudentIds },
            tolovSana: { gte: cashflowMonthStart, lt: cashflowMonthEnd },
          },
          _sum: { summa: true },
        }),
      ]);

    const imtiyozGrouped = new Map();
    for (const row of cashflowImtiyozRows) {
      if (!imtiyozGrouped.has(row.studentId))
        imtiyozGrouped.set(row.studentId, []);
      imtiyozGrouped.get(row.studentId).push(row);
    }

    for (const student of planStudents) {
      const startDate =
        student.enrollments?.[0]?.startDate || student.createdAt;
      if (startOfMonthUtc(new Date(startDate)) > cashflowMonthStart) continue;
      const monthMap = buildImtiyozMonthMap({
        imtiyozlar: imtiyozGrouped.get(student.id) || [],
        oylikSumma: settings.oylikSumma,
      });
      const amount = Number(
        monthMap.has(cashflowMonthKey)
          ? monthMap.get(cashflowMonthKey)
          : settings.oylikSumma,
      );
      if (amount > 0) cashflowPlanAmount += amount;
    }

    cashflowCollectedAmount = Number(cashflowPaidAgg?._sum?.summa || 0);
  }

  const cashflowDebtAmount =
    cashflowMonthKey === currentMonthKey
      ? thisMonthDebtAmount
      : selectedMonthKey
        ? selectedMonthDebtAmount
        : 0;
  const cashflowDiffAmount = cashflowPlanAmount - cashflowCollectedAmount;

  const studentIds = debtMonthFiltered.map((row) => row.id);
  const monthStart = startOfMonthUtc(now);
  const monthEnd = nextMonthStart(now);
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const yearEnd = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));

  const [paidThisMonthAgg, paidThisYearAgg] =
    studentIds.length > 0
      ? await prisma.$transaction([
          prisma.tolovTranzaksiya.aggregate({
            where: {
              holat: "AKTIV",
              studentId: { in: studentIds },
              tolovSana: { gte: monthStart, lt: monthEnd },
            },
            _sum: { summa: true },
          }),
          prisma.tolovTranzaksiya.aggregate({
            where: {
              holat: "AKTIV",
              studentId: { in: studentIds },
              tolovSana: { gte: yearStart, lt: yearEnd },
            },
            _sum: { summa: true },
          }),
        ])
      : [{ _sum: { summa: 0 } }, { _sum: { summa: 0 } }];

  const thisMonthPaidAmount = Number(paidThisMonthAgg?._sum?.summa || 0);
  const thisYearPaidAmount = Number(paidThisYearAgg?._sum?.summa || 0);

  return {
    totalRows,
    totalDebtors,
    totalDebtAmount,
    thisMonthDebtors,
    previousMonthDebtors,
    selectedMonthDebtors,
    thisMonthDebtAmount,
    previousMonthDebtAmount,
    selectedMonthDebtAmount,
    thisMonthPaidAmount,
    thisYearPaidAmount,
    monthlyPlanAmount,
    yearlyPlanAmount: monthlyPlanAmount * 12,
    tarifOylikSumma: Number(settings.oylikSumma || 0),
    tarifYillikSumma: Number(settings.yillikSumma || 0),
    cashflow: {
      month: cashflowMonthKey,
      monthFormatted: safeFormatMonthKey(cashflowMonthKey),
      planAmount: cashflowPlanAmount,
      collectedAmount: cashflowCollectedAmount,
      debtAmount: cashflowDebtAmount,
      diffAmount: cashflowDiffAmount,
    },
    selectedMonth: selectedMonthKey,
  };
}

async function fetchAllFinanceRows({ search, classroomId, settings }) {
  const limit = 500;
  let page = 1;
  let total = 0;
  const all = [];

  while (true) {
    const result = await fetchFinancePageRows({
      search,
      classroomId,
      page,
      limit,
      settings,
    });
    total = result.total;
    all.push(...result.items);
    if (all.length >= total || !result.items.length) break;
    page += 1;
  }

  return all;
}

function createSimplePdfFallback(textLines) {
  const lines = textLines;
  const escapePdfText = (input) =>
    String(input)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const contentLines = ["BT", "/F1 11 Tf", "36 806 Td"];
  lines.forEach((line, idx) => {
    if (idx === 0) {
      contentLines.push(`(${escapePdfText(line)}) Tj`);
      return;
    }
    contentLines.push("0 -16 Td");
    contentLines.push(`(${escapePdfText(line)}) Tj`);
  });
  contentLines.push("ET");
  const contentStream = contentLines.join("\n");
  const contentLength = Buffer.byteLength(contentStream, "utf8");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

async function createPdfBuffer(textLines) {
  let PDFDocument = null;
  try {
    PDFDocument = require("pdfkit");
  } catch {
    PDFDocument = null;
  }

  if (!PDFDocument) {
    return createSimplePdfFallback(textLines);
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 36,
      info: {
        Title: "Maktab CRM Moliya Hisoboti",
      },
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(11);
    for (const line of textLines || []) {
      doc.text(String(line || ""), {
        width: 520,
      });
    }
    doc.end();
  });
}

async function getOrCreateSettings() {
  await prisma.moliyaSozlama.upsert({
    where: { key: "MAIN" },
    update: {},
    create: {
      key: "MAIN",
      oylikSumma: DEFAULT_OYLIK_SUMMA,
      yillikSumma: DEFAULT_YILLIK_SUMMA,
    },
  });

  const now = new Date();
  const dueTarif = await prisma.moliyaTarifVersion.findFirst({
    where: {
      holat: "REJALANGAN",
      boshlanishSana: { lte: now },
    },
    orderBy: [{ boshlanishSana: "desc" }, { createdAt: "desc" }],
  });

  if (dueTarif) {
    await prisma.$transaction(async (tx) => {
      await tx.moliyaTarifVersion.updateMany({
        where: { holat: "AKTIV", NOT: { id: dueTarif.id } },
        data: { holat: "ARXIV" },
      });
      await tx.moliyaTarifVersion.updateMany({
        where: {
          holat: "REJALANGAN",
          boshlanishSana: { lte: now },
          NOT: { id: dueTarif.id },
        },
        data: { holat: "ARXIV" },
      });
      await tx.moliyaTarifVersion.update({
        where: { id: dueTarif.id },
        data: { holat: "AKTIV" },
      });
      await tx.moliyaSozlama.update({
        where: { key: "MAIN" },
        data: {
          oylikSumma: dueTarif.oylikSumma,
          yillikSumma: dueTarif.yillikSumma,
          faolTarifId: dueTarif.id,
        },
      });
      await tx.moliyaTarifAudit.create({
        data: {
          action: "ACTIVATE_TARIF",
          tarifVersionId: dueTarif.id,
          performedByUserId: dueTarif.yaratganAdminUserId,
          newValue: {
            oylikSumma: dueTarif.oylikSumma,
            yillikSumma: dueTarif.yillikSumma,
            boshlanishSana: dueTarif.boshlanishSana,
          },
          izoh: "Rejalangan tarif avtomatik aktiv qilindi",
        },
      });
    });
  }

  return prisma.moliyaSozlama.findUnique({ where: { key: "MAIN" } });
}

function mapTarifRow(row) {
  return {
    id: row.id,
    oylikSumma: row.oylikSumma,
    yillikSumma: row.yillikSumma,
    boshlanishSana: row.boshlanishSana,
    holat: row.holat,
    izoh: row.izoh || "",
    createdAt: row.createdAt,
    createdBy: row.yaratganAdminUser
      ? {
          id: row.yaratganAdminUser.id,
          username: row.yaratganAdminUser.username,
          fullName:
            `${row.yaratganAdminUser.admin?.firstName || ""} ${row.yaratganAdminUser.admin?.lastName || ""}`.trim() ||
            row.yaratganAdminUser.username,
        }
      : null,
  };
}

function mapTarifAuditRow(row) {
  return {
    id: row.id,
    action: row.action,
    oldValue: row.oldValue || null,
    newValue: row.newValue || null,
    izoh: row.izoh || "",
    createdAt: row.createdAt,
    tarifVersionId: row.tarifVersionId || null,
    performedBy: row.performedByUser
      ? {
          id: row.performedByUser.id,
          username: row.performedByUser.username,
          fullName:
            `${row.performedByUser.admin?.firstName || ""} ${row.performedByUser.admin?.lastName || ""}`.trim() ||
            row.performedByUser.username,
        }
      : null,
  };
}

async function buildFinanceSettingsPayload(settings) {
  const [tarifRows, auditRows, studentCount] = await Promise.all([
    prisma.moliyaTarifVersion.findMany({
      orderBy: [{ boshlanishSana: "desc" }, { createdAt: "desc" }],
      take: 30,
      include: {
        yaratganAdminUser: {
          select: {
            id: true,
            username: true,
            admin: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.moliyaTarifAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        performedByUser: {
          select: {
            id: true,
            username: true,
            admin: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.student.count(),
  ]);

  const summary = await fetchFinanceSummary({
    search: "",
    classroomId: null,
    status: "ALL",
    debtMonth: "ALL",
    debtTargetMonth: null,
    settings,
  });

  const debtors = Number(summary.totalDebtors || 0);
  const tolayotganlar = Math.max(
    studentCount - Number(summary.thisMonthDebtors || 0),
    0,
  );
  const expectedMonthly = Number(
    summary.cashflow?.planAmount || summary.monthlyPlanAmount || 0,
  );
  const expectedYearly = Number(summary.yearlyPlanAmount || 0);

  return {
    settings: {
      oylikSumma: settings.oylikSumma,
      yillikSumma: settings.yillikSumma,
      faolTarifId: settings.faolTarifId || null,
    },
    preview: {
      studentCount,
      debtorCount: debtors,
      tolayotganlar,
      expectedMonthly,
      expectedYearly,
      gapMonthly: Number(summary.thisMonthDebtAmount || 0),
      gapYearly: Number(summary.totalDebtAmount || 0),
      thisMonthPaidAmount: Number(summary.thisMonthPaidAmount || 0),
      thisYearPaidAmount: Number(summary.thisYearPaidAmount || 0),
      cashflowDiffAmount: Number(summary.cashflow?.diffAmount || 0),
    },
    constraints: {
      minSumma: MIN_SUMMA,
      maxSumma: MAX_SUMMA,
    },
    tarifHistory: tarifRows.map(mapTarifRow),
    tarifAudit: auditRows.map(mapTarifAuditRow),
  };
}

async function getFinanceSettings(_req, res) {
  const settings = await getOrCreateSettings();
  const payload = await buildFinanceSettingsPayload(settings);
  res.json({ ok: true, ...payload });
}

async function upsertFinanceSettings(req, res) {
  const {
    oylikSumma,
    yillikSumma,
    boshlanishTuri = "KELASI_OY",
    izoh,
  } = req.body;
  const current = await getOrCreateSettings();
  const boshlanishSana = resolveTarifStartDate(boshlanishTuri);

  const result = await prisma.$transaction(async (tx) => {
    const createdTarif = await tx.moliyaTarifVersion.create({
      data: {
        oylikSumma,
        yillikSumma,
        boshlanishSana,
        holat: "REJALANGAN",
        izoh: izoh || null,
        yaratganAdminUserId: req.user.sub,
      },
      include: {
        yaratganAdminUser: {
          select: {
            id: true,
            username: true,
            admin: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    await tx.moliyaTarifAudit.create({
      data: {
        action: "CREATE_TARIF",
        tarifVersionId: createdTarif.id,
        performedByUserId: req.user.sub,
        oldValue: {
          oylikSumma: current.oylikSumma,
          yillikSumma: current.yillikSumma,
          faolTarifId: current.faolTarifId || null,
        },
        newValue: {
          oylikSumma,
          yillikSumma,
          boshlanishSana,
          boshlanishTuri,
        },
        izoh: izoh || "Tarif kelasi oydan rejalandi",
      },
    });

    return createdTarif;
  });

  res.json({
    ok: true,
    message: "Yangi tarif rejalandi",
    tarif: mapTarifRow(result),
    activeSettings: {
      oylikSumma: current.oylikSumma,
      yillikSumma: current.yillikSumma,
    },
  });
}

async function rollbackFinanceTarif(req, res) {
  const { tarifId } = req.params;
  const { boshlanishTuri = "KELASI_OY", izoh } = req.body;
  const current = await getOrCreateSettings();
  const sourceTarif = await prisma.moliyaTarifVersion.findUnique({
    where: { id: tarifId },
  });

  if (!sourceTarif) {
    throw new ApiError(404, "TARIF_NOT_FOUND", "Tarif topilmadi");
  }

  const boshlanishSana = resolveTarifStartDate(boshlanishTuri);

  const rollbackTarif = await prisma.$transaction(async (tx) => {
    const created = await tx.moliyaTarifVersion.create({
      data: {
        oylikSumma: sourceTarif.oylikSumma,
        yillikSumma: sourceTarif.yillikSumma,
        boshlanishSana,
        holat: "REJALANGAN",
        izoh: izoh || `Rollback: ${sourceTarif.id}`,
        yaratganAdminUserId: req.user.sub,
      },
      include: {
        yaratganAdminUser: {
          select: {
            id: true,
            username: true,
            admin: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    await tx.moliyaTarifAudit.create({
      data: {
        action: "ROLLBACK_TARIF",
        tarifVersionId: created.id,
        performedByUserId: req.user.sub,
        oldValue: {
          oylikSumma: current.oylikSumma,
          yillikSumma: current.yillikSumma,
          faolTarifId: current.faolTarifId || null,
        },
        newValue: {
          oylikSumma: sourceTarif.oylikSumma,
          yillikSumma: sourceTarif.yillikSumma,
          boshlanishSana,
          sourceTarifId: sourceTarif.id,
        },
        izoh: izoh || "Tarif rollback rejalandi",
      },
    });

    return created;
  });

  res.json({
    ok: true,
    message: "Rollback tarif rejalandi",
    tarif: mapTarifRow(rollbackTarif),
  });
}

async function getFinanceStudents(req, res) {
  const page = parseIntSafe(req.query.page, 1);
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const search = String(req.query.search || "").trim();
  const status = req.query.status || "ALL";
  const classroomId = req.query.classroomId || null;
  const debtMonth = req.query.debtMonth || "ALL";
  const debtTargetMonth = parseDebtTargetMonth(req.query.debtTargetMonth);
  const cashflowMonth = parseDebtTargetMonth(req.query.cashflowMonth);

  const settings = await getOrCreateSettings();
  const allRows = await fetchAllFinanceRows({
    search,
    classroomId,
    settings,
  });
  const filteredRows = filterFinanceRowsByQuery(allRows, {
    status,
    debtMonth,
    debtTargetMonth,
  });
  const total = filteredRows.length;
  const pages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const resultItems = filteredRows.slice(offset, offset + limit);

  const summary = await fetchFinanceSummary({
    search,
    classroomId,
    status,
    debtMonth,
    debtTargetMonth,
    cashflowMonth,
    settings,
    rows: allRows,
  });

  res.json({
    ok: true,
    page,
    limit,
    total,
    pages,
    settings: {
      oylikSumma: settings.oylikSumma,
      yillikSumma: settings.yillikSumma,
      faolTarifId: settings.faolTarifId || null,
    },
    summary,
    students: resultItems,
  });
}

async function exportDebtorsXlsx(req, res) {
  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch {
    throw new ApiError(
      500,
      "XLSX_NOT_INSTALLED",
      "Excel export uchun 'xlsx' paketi o'rnatilmagan",
    );
  }

  const search = String(req.query.search || "").trim();
  const classroomId = req.query.classroomId || null;
  const settings = await getOrCreateSettings();
  const rows = await fetchAllFinanceRows({
    search,
    classroomId,
    settings,
  });
  const debtorRows = filterFinanceRowsByQuery(rows, { status: "QARZDOR" });

  const exportRows = debtorRows.map((row) => ({
    Oquvchi: row.fullName,
    Username: row.username,
    Sinf: row.classroom,
    QarzOylarSoni: row.qarzOylarSoni,
    QarzOylar: row.qarzOylarFormatted.join(", "),
    JamiQarzSom: row.jamiQarzSumma,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(exportRows),
    "Qarzdorlar",
  );
  const fileBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const fileName = `moliya-qarzdorlar-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(fileBuffer);
}

async function exportDebtorsPdf(req, res) {
  const search = String(req.query.search || "").trim();
  const classroomId = req.query.classroomId || null;
  const settings = await getOrCreateSettings();
  const rows = await fetchAllFinanceRows({
    search,
    classroomId,
    settings,
  });
  const debtorRows = filterFinanceRowsByQuery(rows, { status: "QARZDOR" });
  const lines = [
    "Maktab CRM - Qarzdorlar ro'yxati",
    `Sana: ${new Date().toISOString().slice(0, 10)}`,
    `Jami qarzdorlar: ${debtorRows.length}`,
    "",
    ...debtorRows
      .slice(0, 35)
      .map(
        (row, idx) =>
          `${idx + 1}. ${row.fullName} | ${row.classroom} | ${row.qarzOylarFormatted.join(", ") || "-"}`,
      ),
  ];

  const pdfBuffer = await createPdfBuffer(lines);
  const fileName = `moliya-qarzdorlar-${new Date().toISOString().slice(0, 10)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(pdfBuffer);
}

async function getStudentFinanceDetail(req, res) {
  const { studentId } = req.params;
  const settings = await getOrCreateSettings();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { username: true, phone: true } },
      enrollments: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { classroom: { select: { name: true, academicYear: true } } },
      },
    },
  });
  if (!student)
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");

  const [qoplamalar, imtiyozlar] = await Promise.all([
    prisma.tolovQoplama.findMany({
      where: { studentId },
      select: { studentId: true, yil: true, oy: true },
    }),
    prisma.tolovImtiyozi.findMany({
      where: { studentId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        studentId: true,
        turi: true,
        qiymat: true,
        boshlanishOy: true,
        oylarSoni: true,
        oylarSnapshot: true,
        sabab: true,
        izoh: true,
        isActive: true,
        createdAt: true,
        bekorQilinganAt: true,
        bekorQilishSababi: true,
      },
    }),
  ]);
  const paidSet = buildPaidMonthMap(qoplamalar).get(studentId) || new Set();
  const imtiyozMonthMap = buildImtiyozMonthMap({
    imtiyozlar,
    oylikSumma: settings.oylikSumma,
  });
  const debtInfo = buildDebtInfo({
    startDate: student.enrollments?.[0]?.startDate || student.createdAt,
    paidMonthSet: paidSet,
    oylikSumma: settings.oylikSumma,
    imtiyozMonthMap,
  });

  const studentRow = mapStudentRowFromRaw(
    {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      username: student.user?.username,
      phone: student.user?.phone,
      classroomName: student.enrollments?.[0]?.classroom?.name,
      academicYear: student.enrollments?.[0]?.classroom?.academicYear,
    },
    debtInfo,
  );

  const transactions = await prisma.tolovTranzaksiya.findMany({
    where: { studentId },
    include: {
      qoplamalar: {
        select: { yil: true, oy: true },
        orderBy: [{ yil: "desc" }, { oy: "desc" }],
      },
    },
    orderBy: { tolovSana: "desc" },
  });

  res.json({
    ok: true,
    student: studentRow,
    imtiyozlar: imtiyozlar.map(mapImtiyozRow),
    transactions: transactions.map((t) => {
      const activeMonths = t.qoplamalar.map(
        (q) => `${q.yil}-${String(q.oy).padStart(2, "0")}`,
      );
      const snapshotMonths = Array.isArray(t.qoplanganOylar)
        ? t.qoplanganOylar
        : [];
      const qoplanganOylar = activeMonths.length
        ? activeMonths
        : snapshotMonths;

      return {
        id: t.id,
        turi: t.turi,
        holat: t.holat,
        summa: t.summa,
        tolovSana: t.tolovSana,
        izoh: t.izoh || "",
        bekorSana: t.bekorSana,
        bekorIzoh: t.bekorIzoh || "",
        tarifVersionId: t.tarifVersionId || null,
        tarifSnapshot: t.tarifSnapshot || null,
        qoplanganOylar,
        qoplanganOylarFormatted: qoplanganOylar.map(safeFormatMonthKey),
      };
    }),
  });
}

async function createStudentImtiyoz(req, res) {
  const { studentId } = req.params;
  const { turi, qiymat, boshlanishOy, oylarSoni, sabab, izoh } = req.body;
  const settings = await getOrCreateSettings();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });
  if (!student)
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  if (turi === "SUMMA" && Number(qiymat) >= Number(settings.oylikSumma)) {
    throw new ApiError(
      400,
      "IMTIYOZ_SUMMA_INVALID",
      "SUMMA imtiyoz oylik summadan kichik bo'lishi kerak. To'liq ozod uchun alohida turdan foydalaning.",
    );
  }
  const snapshotRows = buildImtiyozSnapshotRows({
    turi,
    qiymat: turi === "TOLIQ_OZOD" ? null : Number(qiymat),
    boshlanishOy,
    oylarSoni: Number(oylarSoni || 1),
    oylikSumma: settings.oylikSumma,
  });

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.tolovImtiyozi.create({
      data: {
        studentId,
        adminUserId: req.user.sub,
        turi,
        qiymat: turi === "TOLIQ_OZOD" ? null : Number(qiymat),
        boshlanishOy,
        oylarSoni: Number(oylarSoni || 1),
        oylarSnapshot: snapshotRows,
        sabab,
        izoh: izoh || null,
      },
    });

    let appliedMonthKeys = [];
    if (turi === "TOLIQ_OZOD") {
      const months = buildMonthRange(boshlanishOy, Number(oylarSoni || 1));
      const existing = await tx.tolovQoplama.findMany({
        where: {
          studentId,
          OR: months.map((m) => ({ yil: m.yil, oy: m.oy })),
        },
        select: { yil: true, oy: true },
      });
      const existingSet = new Set(
        existing.map((m) => `${m.yil}-${String(m.oy).padStart(2, "0")}`),
      );
      const appliedMonths = months.filter(
        (m) => !existingSet.has(`${m.yil}-${String(m.oy).padStart(2, "0")}`),
      );
      appliedMonthKeys = appliedMonths.map(
        (m) => `${m.yil}-${String(m.oy).padStart(2, "0")}`,
      );

      if (appliedMonths.length) {
        const txn = await tx.tolovTranzaksiya.create({
          data: {
            studentId,
            adminUserId: req.user.sub,
            turi: "IXTIYORIY",
            summa: 0,
            izoh: `[Imtiyoz] To'liq ozod: ${sabab}`,
            qoplanganOylar: appliedMonthKeys,
          },
        });
        await tx.tolovQoplama.createMany({
          data: appliedMonths.map((m) => ({
            studentId,
            tranzaksiyaId: txn.id,
            yil: m.yil,
            oy: m.oy,
          })),
          skipDuplicates: true,
        });
      }
    }

    return { created, appliedMonthKeys };
  });

  res.status(201).json({
    ok: true,
    imtiyoz: mapImtiyozRow(result.created),
    qoplanganOylar: result.appliedMonthKeys,
    qoplanganOylarFormatted: result.appliedMonthKeys.map(safeFormatMonthKey),
  });
}

async function deactivateStudentImtiyoz(req, res) {
  const { imtiyozId } = req.params;
  const sabab = req.body?.sabab || null;
  const settings = await getOrCreateSettings();

  const existing = await prisma.tolovImtiyozi.findUnique({
    where: { id: imtiyozId },
    select: {
      id: true,
      studentId: true,
      turi: true,
      qiymat: true,
      boshlanishOy: true,
      oylarSoni: true,
      oylarSnapshot: true,
      isActive: true,
    },
  });
  if (!existing) {
    throw new ApiError(404, "IMTIYOZ_NOT_FOUND", "Imtiyoz topilmadi");
  }
  if (!existing.isActive) {
    throw new ApiError(
      409,
      "IMTIYOZ_ALREADY_DEACTIVATED",
      "Imtiyoz allaqachon bekor qilingan",
    );
  }

  const currentMonthKey = monthKeyFromDate(new Date());
  const currentMonthSerial = monthKeyToSerial(currentMonthKey);
  const existingSnapshot =
    Array.isArray(existing.oylarSnapshot) && existing.oylarSnapshot.length
      ? existing.oylarSnapshot
      : buildImtiyozSnapshotRows({
          turi: existing.turi,
          qiymat: existing.qiymat,
          boshlanishOy: existing.boshlanishOy,
          oylarSoni: existing.oylarSoni,
          oylikSumma: settings.oylikSumma,
        });
  const retainedSnapshot = existingSnapshot
    .map((entry) => {
      const key =
        typeof entry?.key === "string"
          ? entry.key
          : Number.isFinite(Number(entry?.yil)) &&
              Number.isFinite(Number(entry?.oy))
            ? `${Number(entry.yil)}-${String(Number(entry.oy)).padStart(2, "0")}`
            : null;
      const serial = monthKeyToSerial(key);
      if (!key || serial === null || serial >= currentMonthSerial) return null;
      const [yilStr, oyStr] = key.split("-");
      return {
        key,
        yil: Number(yilStr),
        oy: Number(oyStr),
        oySumma: Math.max(
          0,
          Number(entry?.oySumma ?? entry?.summa ?? entry?.amount ?? 0),
        ),
      };
    })
    .filter(Boolean);

  const updated = await prisma.tolovImtiyozi.update({
    where: { id: imtiyozId },
    data: {
      isActive: false,
      bekorQilinganAt: new Date(),
      bekorQilinganAdminUserId: req.user.sub,
      bekorQilishSababi: sabab,
      oylarSnapshot: retainedSnapshot,
    },
  });

  res.json({
    ok: true,
    imtiyoz: mapImtiyozRow(updated),
  });
}

async function createStudentPayment(req, res) {
  const { studentId } = req.params;
  const settings = await getOrCreateSettings();
  const startMonth = req.body.startMonth || monthKeyFromDate(new Date());
  const turi = req.body.turi;
  const requestedMonthsRaw = Number.parseInt(
    String(req.body.oylarSoni ?? ""),
    10,
  );
  const hasRawSumma =
    req.body.summa !== undefined &&
    req.body.summa !== null &&
    String(req.body.summa).trim() !== "";
  const hasRequestedSumma =
    hasRawSumma && Number.isFinite(Number(req.body.summa));
  const requestedSumma = hasRequestedSumma ? Number(req.body.summa) : null;

  const oylarSoni = resolvePaymentMonthCount({
    turi,
    oylarSoniRaw: requestedMonthsRaw,
  });

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      createdAt: true,
      enrollments: {
        where: { isActive: true },
        select: { id: true, startDate: true },
        take: 1,
      },
    },
  });
  if (!student)
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  if (!student.enrollments.length) {
    throw new ApiError(
      400,
      "ENROLLMENT_REQUIRED",
      "Student faol sinfga biriktirilmagan",
    );
  }

  const enrollmentStartMonth = monthKeyFromDate(
    startOfMonthUtc(
      new Date(student.enrollments?.[0]?.startDate || student.createdAt),
    ),
  );
  const startMonthSerial = monthKeyToSerial(startMonth);
  const enrollmentStartSerial = monthKeyToSerial(enrollmentStartMonth);
  if (
    startMonthSerial === null ||
    enrollmentStartSerial === null ||
    startMonthSerial < enrollmentStartSerial
  ) {
    throw new ApiError(
      400,
      "PAYMENT_BEFORE_ENROLLMENT",
      "To'lovni student faol enrollmentidan oldingi oyga yozib bo'lmaydi",
      {
        enrollmentStartMonth,
        enrollmentStartMonthFormatted: safeFormatMonthKey(enrollmentStartMonth),
      },
    );
  }

  const months = buildMonthRange(startMonth, oylarSoni);
  const [existing, imtiyozRows] = await Promise.all([
    prisma.tolovQoplama.findMany({
      where: {
        studentId,
        OR: months.map((m) => ({ yil: m.yil, oy: m.oy })),
      },
      select: { yil: true, oy: true },
    }),
    prisma.tolovImtiyozi.findMany({
      where: {
        studentId,
      },
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

  const existingSet = new Set(
    existing.map((m) => `${m.yil}-${String(m.oy).padStart(2, "0")}`),
  );
  const imtiyozMonthMap = buildImtiyozMonthMap({
    imtiyozlar: imtiyozRows,
    oylikSumma: settings.oylikSumma,
  });

  const monthPlans = months.map((m) => {
    const key = `${m.yil}-${String(m.oy).padStart(2, "0")}`;
    return {
      key,
      yil: m.yil,
      oy: m.oy,
      isPaid: existingSet.has(key),
      oySumma: Number(
        imtiyozMonthMap.has(key)
          ? imtiyozMonthMap.get(key)
          : settings.oylikSumma,
      ),
    };
  });

  const alreadyPaidMonths = monthPlans.filter((m) => m.isPaid);
  if (alreadyPaidMonths.length) {
    throw new ApiError(
      409,
      "PAYMENT_MONTH_ALREADY_COVERED",
      "Tanlangan oylarning bir qismi oldin to'langan. Oylarni qayta tanlang.",
      {
        alreadyPaidMonths: alreadyPaidMonths.map((m) => m.key),
        alreadyPaidMonthsFormatted: alreadyPaidMonths.map((m) =>
          safeFormatMonthKey(m.key),
        ),
      },
    );
  }

  const appliedMonths = monthPlans.filter((m) => m.oySumma > 0);
  const appliedMonthKeys = appliedMonths.map((m) => m.key);
  const fullyDiscountedMonths = monthPlans
    .filter((m) => m.oySumma <= 0)
    .map((m) => m.key);

  if (!appliedMonths.length) {
    throw new ApiError(
      400,
      "PAYMENT_NOT_REQUIRED",
      "Tanlangan oylar imtiyoz bilan yopilgan, to'lov talab qilinmaydi",
      {
        fullyDiscountedMonths,
        fullyDiscountedMonthsFormatted: fullyDiscountedMonths.map((m) =>
          safeFormatMonthKey(m),
        ),
      },
    );
  }

  const expectedSumma = appliedMonths.reduce(
    (acc, row) => acc + Number(row.oySumma || 0),
    0,
  );
  const finalSumma = resolvePaymentAmount({
    expectedSumma,
    requestedSumma,
  });

  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.tolovTranzaksiya.create({
      data: {
        studentId,
        adminUserId: req.user.sub,
        turi,
        summa: finalSumma,
        izoh: req.body.izoh || null,
        qoplanganOylar: appliedMonthKeys,
        tarifVersionId: settings.faolTarifId || null,
        tarifSnapshot: {
          oylikSumma: settings.oylikSumma,
          yillikSumma: settings.yillikSumma,
          faolTarifId: settings.faolTarifId || null,
        },
      },
    });

    const inserted = await tx.tolovQoplama.createMany({
      data: appliedMonths.map((m) => ({
        studentId,
        tranzaksiyaId: created.id,
        yil: m.yil,
        oy: m.oy,
      })),
      skipDuplicates: true,
    });

    if (inserted.count !== appliedMonths.length) {
      throw new ApiError(
        409,
        "PAYMENT_MONTH_CONFLICT",
        "Tanlangan oylarning bir qismi boshqa to'lov bilan yopilgan. Sahifani yangilang va qayta urinib ko'ring.",
      );
    }

    return created;
  });

  res.status(201).json({
    ok: true,
    transactionId: transaction.id,
    appliedMonths: appliedMonthKeys,
    appliedMonthsFormatted: appliedMonthKeys.map(safeFormatMonthKey),
    skippedDiscountedMonths: fullyDiscountedMonths,
    skippedDiscountedMonthsFormatted: fullyDiscountedMonths.map((m) =>
      safeFormatMonthKey(m),
    ),
    summa: finalSumma,
    expectedSumma,
    oylarSoni,
    turi,
  });
}

async function revertPayment(req, res) {
  const { tolovId } = req.params;
  const txn = await prisma.tolovTranzaksiya.findUnique({
    where: { id: tolovId },
    include: {
      qoplamalar: { select: { yil: true, oy: true } },
    },
  });

  if (!txn) {
    throw new ApiError(404, "PAYMENT_NOT_FOUND", "To'lov topilmadi");
  }
  if (txn.holat === "BEKOR_QILINGAN") {
    throw new ApiError(
      409,
      "PAYMENT_ALREADY_REVERTED",
      "Bu to'lov allaqachon bekor qilingan",
    );
  }

  const qoplamalardagiOylar = txn.qoplamalar.map(
    (q) => `${q.yil}-${String(q.oy).padStart(2, "0")}`,
  );
  const snapshotOylar = Array.isArray(txn.qoplanganOylar)
    ? txn.qoplanganOylar
    : [];
  const freedMonths = qoplamalardagiOylar.length
    ? qoplamalardagiOylar
    : snapshotOylar;

  await prisma.$transaction(async (tx) => {
    await tx.tolovQoplama.deleteMany({ where: { tranzaksiyaId: tolovId } });
    await tx.tolovTranzaksiya.update({
      where: { id: tolovId },
      data: {
        holat: "BEKOR_QILINGAN",
        bekorSana: new Date(),
        bekorQilganAdminUserId: req.user.sub,
      },
    });
  });

  res.json({
    ok: true,
    reverted: true,
    tolovId,
    freedMonths,
    freedMonthsFormatted: freedMonths.map(safeFormatMonthKey),
  });
}

module.exports = {
  getFinanceSettings,
  upsertFinanceSettings,
  rollbackFinanceTarif,
  getFinanceStudents,
  exportDebtorsXlsx,
  exportDebtorsPdf,
  getStudentFinanceDetail,
  createStudentImtiyoz,
  deactivateStudentImtiyoz,
  createStudentPayment,
  revertPayment,
};
