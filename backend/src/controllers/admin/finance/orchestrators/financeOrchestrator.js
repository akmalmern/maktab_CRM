const { Prisma } = require("@prisma/client");
const prisma = require("../../../../prisma");
const { ApiError } = require("../../../../utils/apiError");
const {
  monthKeyFromDate,
  monthKeyFromParts,
  buildImtiyozMonthMap,
} = require("../../../../services/financeDebtService");
const {
  resolvePaymentAmount,
  resolvePaymentPlan,
} = require("../../../../services/financePaymentService");
const {
  syncStudentOyMajburiyatlar,
  summarizeDebtFromMajburiyatRows,
} = require("../../../../services/financeMajburiyatService");
const {
  parseIntSafe: parseIntSafeShared,
  startOfMonthUtc: startOfMonthUtcShared,
  nextMonthStart: nextMonthStartShared,
  resolveTarifStartDate: resolveTarifStartDateShared,
  safeFormatMonthKey: safeFormatMonthKeyShared,
  monthKeyToSerial: monthKeyToSerialShared,
  parseDebtTargetMonth: parseDebtTargetMonthShared,
} = require("../shared/common");
const {
  buildImtiyozSnapshotRows: buildImtiyozSnapshotRowsShared,
  parseImtiyozStartPartsFromKey: parseImtiyozStartPartsFromKeyShared,
  mapImtiyozRow: mapImtiyozRowShared,
} = require("../shared/imtiyoz");
const {
  filterFinanceRowsByQuery: filterFinanceRowsByQueryShared,
  mapStudentRowFromRaw: mapStudentRowFromRawShared,
  buildWhereSql: buildWhereSqlShared,
  buildStatusSql: buildStatusSqlShared,
  buildDebtMonthSql: buildDebtMonthSqlShared,
} = require("../shared/filters");
const { createPdfBuffer: createPdfBufferShared } = require("../shared/pdf");
const {
  mapTarifRow: mapTarifRowShared,
  mapTarifAuditRow: mapTarifAuditRowShared,
} = require("../shared/tarifMappers");
const { utcDateToTashkentIsoDate } = require("../../../../utils/tashkentTime");

const DEFAULT_OYLIK_SUMMA = 300000;
const DEFAULT_TOLOV_OYLAR_SONI = 10;
const DEFAULT_YILLIK_SUMMA = DEFAULT_OYLIK_SUMMA * DEFAULT_TOLOV_OYLAR_SONI;
const MIN_SUMMA = 50_000;
const MAX_SUMMA = 50_000_000;
const SCHOOL_MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

function parseIntSafe(value, fallback) {
  return parseIntSafeShared(value, fallback);
}

function startOfMonthUtc(date) {
  return startOfMonthUtcShared(date);
}

function nextMonthStart(date = new Date()) {
  return nextMonthStartShared(date);
}

function resolveTarifStartDate(startType) {
  return resolveTarifStartDateShared(startType);
}

function safeFormatMonthKey(value) {
  return safeFormatMonthKeyShared(value);
}

function monthKeyToSerial(monthKey) {
  return monthKeyToSerialShared(monthKey);
}

function normalizeTolovOylarSoni(value, fallback = DEFAULT_TOLOV_OYLAR_SONI) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const intVal = Math.trunc(num);
  if (intVal < 1 || intVal > 12) return fallback;
  return intVal;
}

function deriveYillikSumma(oylikSumma, tolovOylarSoni = DEFAULT_TOLOV_OYLAR_SONI) {
  return Number(oylikSumma || 0) * normalizeTolovOylarSoni(tolovOylarSoni);
}

function sortChargeableMonths(months = []) {
  return [...months].sort(
    (a, b) => SCHOOL_MONTH_ORDER.indexOf(a) - SCHOOL_MONTH_ORDER.indexOf(b),
  );
}

function normalizeAcademicYearLabel(value) {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{4})$/);
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end !== start + 1) return undefined;
  return `${start}-${end}`;
}

function buildDefaultBillingCalendar(tolovOylarSoni = DEFAULT_TOLOV_OYLAR_SONI) {
  const count = normalizeTolovOylarSoni(tolovOylarSoni);
  return {
    chargeableMonths: sortChargeableMonths(SCHOOL_MONTH_ORDER.slice(0, count)),
  };
}

function normalizeBillingCalendar(rawBillingCalendar, fallbackTolovOylarSoni) {
  const fallbackCount = normalizeTolovOylarSoni(fallbackTolovOylarSoni);
  const academicYear = normalizeAcademicYearLabel(rawBillingCalendar?.academicYear);
  const rawMonths = Array.isArray(rawBillingCalendar?.chargeableMonths)
    ? rawBillingCalendar.chargeableMonths
    : [];
  const normalizedMonths = sortChargeableMonths(
    Array.from(
      new Set(
        rawMonths
          .map((m) => Number.parseInt(String(m), 10))
          .filter((m) => Number.isFinite(m) && m >= 1 && m <= 12),
      ),
    ),
  );
  if (normalizedMonths.length) {
    return {
      ...(academicYear ? { academicYear } : {}),
      chargeableMonths: normalizedMonths,
    };
  }
  return {
    ...(academicYear ? { academicYear } : {}),
    ...buildDefaultBillingCalendar(fallbackCount),
  };
}

function readTarifTolovOylarSoni(row) {
  const billingCalendarMonths = Array.isArray(row?.billingCalendar?.chargeableMonths)
    ? row.billingCalendar.chargeableMonths
        .map((m) => Number.parseInt(String(m), 10))
        .filter((m) => Number.isFinite(m) && m >= 1 && m <= 12)
    : [];
  if (billingCalendarMonths.length) {
    return normalizeTolovOylarSoni(billingCalendarMonths.length);
  }
  const fallback =
    Number(row?.oylikSumma || 0) > 0 && Number(row?.yillikSumma || 0) > 0
      ? Math.round(Number(row.yillikSumma) / Number(row.oylikSumma))
      : DEFAULT_TOLOV_OYLAR_SONI;
  return normalizeTolovOylarSoni(row?.tolovOylarSoni, fallback);
}

function readTarifBillingCalendar(row) {
  return normalizeBillingCalendar(row?.billingCalendar, readTarifTolovOylarSoni(row));
}

function readTarifChargeableMonths(row) {
  return readTarifBillingCalendar(row).chargeableMonths;
}

function isMonthChargeableForTarif(row, monthKey) {
  const month = Number(String(monthKey || "").split("-")[1]);
  if (!Number.isFinite(month) || month < 1 || month > 12) return true;
  const months = readTarifChargeableMonths(row);
  return months.includes(month);
}

function getTashkentLocalMonthStartDateUtc(monthsToAdd = 0) {
  const todayTashkent = utcDateToTashkentIsoDate(new Date());
  const [year, month] = String(todayTashkent)
    .split("-")
    .map((part) => parseInt(part, 10));
  return new Date(Date.UTC(year, (month - 1) + monthsToAdd, 1));
}

function buildImtiyozSnapshotRows({
  turi,
  qiymat,
  boshlanishOy,
  oylarSoni,
  oylikSumma,
}) {
  return buildImtiyozSnapshotRowsShared({
    turi,
    qiymat,
    boshlanishOy,
    oylarSoni,
    oylikSumma,
  });
}

function parseImtiyozStartPartsFromKey(monthKey) {
  return parseImtiyozStartPartsFromKeyShared(monthKey);
}

function filterFinanceRowsByQuery(
  rows,
  { status = "ALL", debtMonth = "ALL", debtTargetMonth = null } = {},
) {
  return filterFinanceRowsByQueryShared(rows, {
    status,
    debtMonth,
    debtTargetMonth,
  });
}

function mapStudentRowFromRaw(row, debtInfo) {
  return mapStudentRowFromRawShared(row, debtInfo, { safeFormatMonthKey });
}

function mapImtiyozRow(row) {
  return mapImtiyozRowShared(row, { safeFormatMonthKey, monthKeyToSerial });
}

function buildWhereSql({ search, classroomId }) {
  return buildWhereSqlShared({ search, classroomId });
}

function buildStatusSql(status) {
  return buildStatusSqlShared(status);
}

function parseDebtTargetMonth(value) {
  return parseDebtTargetMonthShared(value);
}

function buildDebtMonthSql(debtMonth, debtTargetMonth) {
  return buildDebtMonthSqlShared(debtMonth, debtTargetMonth);
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
  if (studentIds.length) {
    await syncStudentOyMajburiyatlar({
      studentIds,
      oylikSumma: settings.oylikSumma,
      futureMonths: 3,
      chargeableMonths: readTarifChargeableMonths(settings),
    });
  }
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const majburiyatRows = studentIds.length
    ? await prisma.studentOyMajburiyat.findMany({
        where: {
          studentId: { in: studentIds },
          OR: [
            { yil: { lt: currentYear } },
            { yil: currentYear, oy: { lte: currentMonth } },
          ],
        },
        select: {
          studentId: true,
          yil: true,
          oy: true,
          netSumma: true,
          tolanganSumma: true,
          qoldiqSumma: true,
          holat: true,
        },
      })
    : [];
  const majburiyatMap = new Map();
  for (const row of majburiyatRows) {
    if (!majburiyatMap.has(row.studentId)) majburiyatMap.set(row.studentId, []);
    majburiyatMap.get(row.studentId).push(row);
  }
  const items = rawRows.map((row) => {
    const debtInfo = summarizeDebtFromMajburiyatRows(majburiyatMap.get(row.id) || []);
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
            boshlanishYil: true,
            boshlanishOyRaqam: true,
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

    const cashflowMonthChargeable = isMonthChargeableForTarif(
      settings,
      cashflowMonthKey,
    );
    for (const student of planStudents) {
      const startDate =
        student.enrollments?.[0]?.startDate || student.createdAt;
      if (startOfMonthUtc(new Date(startDate)) > cashflowMonthStart) continue;
      if (!cashflowMonthChargeable) continue;
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
    yearlyPlanAmount: monthlyPlanAmount * readTarifTolovOylarSoni(settings),
    tarifOylikSumma: Number(settings.oylikSumma || 0),
    tarifYillikSumma: Number(settings.yillikSumma || 0),
    tarifTolovOylarSoni: readTarifTolovOylarSoni(settings),
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

async function createPdfBuffer(textLines) {
  return createPdfBufferShared(textLines);
}

async function getOrCreateSettings() {
  await prisma.moliyaSozlama.upsert({
    where: { key: "MAIN" },
    update: {},
    create: {
      key: "MAIN",
      oylikSumma: DEFAULT_OYLIK_SUMMA,
      yillikSumma: DEFAULT_YILLIK_SUMMA,
      tolovOylarSoni: DEFAULT_TOLOV_OYLAR_SONI,
      billingCalendar: buildDefaultBillingCalendar(DEFAULT_TOLOV_OYLAR_SONI),
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
          tolovOylarSoni: readTarifTolovOylarSoni(dueTarif),
          billingCalendar: readTarifBillingCalendar(dueTarif),
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
            tolovOylarSoni: readTarifTolovOylarSoni(dueTarif),
            billingCalendar: readTarifBillingCalendar(dueTarif),
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
  return mapTarifRowShared(row);
}

function mapTarifAuditRow(row) {
  return mapTarifAuditRowShared(row);
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
      tolovOylarSoni: readTarifTolovOylarSoni(settings),
      billingCalendar: readTarifBillingCalendar(settings),
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
      billingMonthsOptions: [9, 10, 11, 12],
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
    tolovOylarSoni = DEFAULT_TOLOV_OYLAR_SONI,
    billingCalendar,
    boshlanishTuri = "KELASI_OY",
    izoh,
  } = req.body;
  const normalizedBillingCalendar = normalizeBillingCalendar(
    billingCalendar,
    tolovOylarSoni,
  );
  const effectiveTolovOylarSoni = normalizeTolovOylarSoni(
    normalizedBillingCalendar.chargeableMonths.length || tolovOylarSoni,
  );
  const yillikSumma = deriveYillikSumma(oylikSumma, effectiveTolovOylarSoni);
  const current = await getOrCreateSettings();
  const boshlanishSana = resolveTarifStartDate(boshlanishTuri);

  const result = await prisma.$transaction(async (tx) => {
    const createdTarif = await tx.moliyaTarifVersion.create({
        data: {
          oylikSumma,
          yillikSumma,
          tolovOylarSoni: effectiveTolovOylarSoni,
          billingCalendar: normalizedBillingCalendar,
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
          tolovOylarSoni: readTarifTolovOylarSoni(current),
          billingCalendar: readTarifBillingCalendar(current),
          faolTarifId: current.faolTarifId || null,
        },
        newValue: {
          oylikSumma,
          yillikSumma,
          tolovOylarSoni: effectiveTolovOylarSoni,
          billingCalendar: normalizedBillingCalendar,
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
    message: req.t("messages.FINANCE_TARIF_PLANNED"),
    tarif: mapTarifRow(result),
    activeSettings: {
      oylikSumma: current.oylikSumma,
      yillikSumma: current.yillikSumma,
      tolovOylarSoni: readTarifTolovOylarSoni(current),
      billingCalendar: readTarifBillingCalendar(current),
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
          tolovOylarSoni: readTarifTolovOylarSoni(sourceTarif),
          billingCalendar: readTarifBillingCalendar(sourceTarif),
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
          tolovOylarSoni: readTarifTolovOylarSoni(current),
          billingCalendar: readTarifBillingCalendar(current),
          faolTarifId: current.faolTarifId || null,
        },
        newValue: {
          oylikSumma: sourceTarif.oylikSumma,
          yillikSumma: sourceTarif.yillikSumma,
          tolovOylarSoni: readTarifTolovOylarSoni(sourceTarif),
          billingCalendar: readTarifBillingCalendar(sourceTarif),
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
    message: req.t("messages.FINANCE_ROLLBACK_PLANNED"),
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
      tolovOylarSoni: readTarifTolovOylarSoni(settings),
      billingCalendar: readTarifBillingCalendar(settings),
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

  await syncStudentOyMajburiyatlar({
    studentIds: [studentId],
    oylikSumma: settings.oylikSumma,
    futureMonths: 3,
    chargeableMonths: readTarifChargeableMonths(settings),
  });

  const [majburiyatlar, imtiyozlar] = await Promise.all([
    prisma.studentOyMajburiyat.findMany({
      where: { studentId },
      orderBy: [{ yil: "asc" }, { oy: "asc" }],
      select: {
        yil: true,
        oy: true,
        bazaSumma: true,
        imtiyozSumma: true,
        netSumma: true,
        tolanganSumma: true,
        qoldiqSumma: true,
        holat: true,
      },
    }),
    prisma.tolovImtiyozi.findMany({
      where: { studentId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        studentId: true,
        turi: true,
        qiymat: true,
        boshlanishYil: true,
        boshlanishOyRaqam: true,
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
  const now = new Date();
  const debtInfo = summarizeDebtFromMajburiyatRows(
    majburiyatlar.filter(
      (r) =>
        r.yil < now.getUTCFullYear() ||
        (r.yil === now.getUTCFullYear() && r.oy <= now.getUTCMonth() + 1),
    ),
  );

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
        select: { yil: true, oy: true, summa: true },
        orderBy: [{ yil: "desc" }, { oy: "desc" }],
      },
    },
    orderBy: { tolovSana: "desc" },
  });

  res.json({
    ok: true,
    student: studentRow,
    majburiyatlar: majburiyatlar.map((m) => {
      const key = `${m.yil}-${String(m.oy).padStart(2, "0")}`;
      return {
        yil: m.yil,
        oy: m.oy,
        key,
        oyLabel: safeFormatMonthKey(key),
        bazaSumma: Number(m.bazaSumma || 0),
        imtiyozSumma: Number(m.imtiyozSumma || 0),
        netSumma: Number(m.netSumma || 0),
        tolanganSumma: Number(m.tolanganSumma || 0),
        qoldiqSumma: Number(m.qoldiqSumma || 0),
        holat: m.holat,
      };
    }),
    imtiyozlar: imtiyozlar.map(mapImtiyozRow),
    transactions: transactions.map((t) => {
      const qoplanganOylar = t.qoplamalar.map(
        (q) => `${q.yil}-${String(q.oy).padStart(2, "0")}`,
      );

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
        qoplamalar: t.qoplamalar.map((q) => ({
          yil: q.yil,
          oy: q.oy,
          key: `${q.yil}-${String(q.oy).padStart(2, "0")}`,
          oyLabel: safeFormatMonthKey(`${q.yil}-${String(q.oy).padStart(2, "0")}`),
          summa: Number(q.summa || 0),
        })),
      };
    }),
  });
}

async function createStudentImtiyoz(req, res) {
  const { studentId } = req.params;
  const { turi, qiymat, boshlanishOy, oylarSoni, sabab, izoh } = req.body;
  const { boshlanishYil, boshlanishOyRaqam } = parseImtiyozStartPartsFromKey(
    boshlanishOy,
  );
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
        boshlanishYil,
        boshlanishOyRaqam,
        oylarSoni: Number(oylarSoni || 1),
        oylarSnapshot: snapshotRows,
        sabab,
        izoh: izoh || null,
      },
    });

    let appliedMonthKeys = [];
      if (turi === "TOLIQ_OZOD") {
        const months = buildMonthRange(boshlanishOy, Number(oylarSoni || 1));
        appliedMonthKeys = months.map(
          (m) => `${m.yil}-${String(m.oy).padStart(2, "0")}`,
        );
      }

    return { created, appliedMonthKeys };
  });

  await syncStudentOyMajburiyatlar({
    studentIds: [studentId],
    oylikSumma: settings.oylikSumma,
    futureMonths: 3,
    chargeableMonths: readTarifChargeableMonths(settings),
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
      boshlanishYil: true,
      boshlanishOyRaqam: true,
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
          boshlanishOy: monthKeyFromParts(
            Number(existing.boshlanishYil),
            Number(existing.boshlanishOyRaqam),
          ),
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

  await syncStudentOyMajburiyatlar({
    studentIds: [existing.studentId],
    oylikSumma: settings.oylikSumma,
    futureMonths: 3,
    chargeableMonths: readTarifChargeableMonths(settings),
  });

  res.json({
    ok: true,
    imtiyoz: mapImtiyozRow(updated),
  });
}

function getPaymentRequestInput(req) {
  const startMonth = req.body.startMonth || monthKeyFromDate(new Date());
  const turi = req.body.turi;
  const requestedMonthsRaw = Number.parseInt(String(req.body.oylarSoni ?? ""), 10);
  const hasRawSumma =
    req.body.summa !== undefined &&
    req.body.summa !== null &&
    String(req.body.summa).trim() !== "";
  const hasRequestedSumma = hasRawSumma && Number.isFinite(Number(req.body.summa));
  const requestedSumma = hasRequestedSumma ? Number(req.body.summa) : null;
  const idempotencyKey =
    req.body.idempotencyKey && String(req.body.idempotencyKey).trim()
      ? String(req.body.idempotencyKey).trim()
      : null;

  return {
    startMonth,
    turi,
    requestedMonthsRaw,
    requestedSumma,
    idempotencyKey,
  };
}

async function buildStudentPaymentDraftContext({
  prismaClient = prisma,
  studentId,
  settings,
  startMonth,
  turi,
  requestedMonthsRaw,
}) {
  const student = await prismaClient.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      createdAt: true,
      enrollments: {
        where: { isActive: true },
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
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
    startOfMonthUtc(new Date(student.enrollments?.[0]?.startDate || student.createdAt)),
  );
  const enrollmentStartSerial = monthKeyToSerial(enrollmentStartMonth);
  const maxFutureMonths = 3;
  const maxAllowedMonthKey = monthKeyFromDate(
    getTashkentLocalMonthStartDateUtc(maxFutureMonths),
  );
  const maxAllowedSerial = monthKeyToSerial(maxAllowedMonthKey);

  const imtiyozRows = await prismaClient.tolovImtiyozi.findMany({
    where: { studentId },
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
  });
  const imtiyozMonthMap = buildImtiyozMonthMap({
    imtiyozlar: imtiyozRows,
    oylikSumma: settings.oylikSumma,
  });
  const { oylarSoni, monthPlans: draftPlans } = resolvePaymentPlan({
    turi,
    startMonth,
    oylarSoniRaw: requestedMonthsRaw,
    monthAmountByKey: imtiyozMonthMap,
    defaultMonthAmount: settings.oylikSumma,
  });
  const chargeableMonths = readTarifChargeableMonths(settings);
  const chargeableMonthSet = new Set(chargeableMonths);
  const normalizedDraftPlans = draftPlans.map((item) =>
    chargeableMonthSet.has(Number(item.oy))
      ? item
      : {
          ...item,
          oySumma: 0,
        },
  );

  const invalidBeforeEnrollment = [];
  const invalidFuture = [];
  for (const item of normalizedDraftPlans) {
    const serial = monthKeyToSerial(item.key);
    if (serial === null || enrollmentStartSerial === null || serial < enrollmentStartSerial) {
      invalidBeforeEnrollment.push(item.key);
      continue;
    }
    if (maxAllowedSerial !== null && serial > maxAllowedSerial) {
      invalidFuture.push(item.key);
    }
  }

  if (invalidBeforeEnrollment.length || invalidFuture.length) {
    throw new ApiError(
      400,
      "PAYMENT_MONTH_RANGE_INVALID",
      "Tanlangan oylarning bir qismi to'lov oralig'idan tashqarida",
      {
        enrollmentStartMonth,
        enrollmentStartMonthFormatted: safeFormatMonthKey(enrollmentStartMonth),
        maxAllowedMonth: maxAllowedMonthKey,
        maxAllowedMonthFormatted: safeFormatMonthKey(maxAllowedMonthKey),
        invalidBeforeEnrollment,
        invalidBeforeEnrollmentFormatted: invalidBeforeEnrollment.map(safeFormatMonthKey),
        invalidFutureMonths: invalidFuture,
        invalidFutureMonthsFormatted: invalidFuture.map(safeFormatMonthKey),
      },
    );
  }

  return {
    student,
    oylarSoni,
    draftPlans: normalizedDraftPlans,
    enrollmentStartMonth,
    maxAllowedMonthKey,
    chargeableMonths,
  };
}

async function buildPaymentAllocationPreview({
  prismaClient = prisma,
  studentId,
  draftPlans,
  requestedSumma,
  throwOnAlreadyPaid = false,
}) {
  const months = draftPlans.map((m) => ({ yil: m.yil, oy: m.oy }));
  const existing = months.length
    ? await prismaClient.tolovQoplama.findMany({
        where: {
          studentId,
          OR: months.map((m) => ({ yil: m.yil, oy: m.oy })),
        },
        select: { yil: true, oy: true, summa: true },
      })
    : [];

  const existingAmountMap = new Map();
  for (const row of existing) {
    const key = `${row.yil}-${String(row.oy).padStart(2, "0")}`;
    existingAmountMap.set(
      key,
      Number(existingAmountMap.get(key) || 0) + Number(row.summa || 0),
    );
  }

  const monthPlans = draftPlans.map((m) => ({
    ...m,
    paidSumma: Number(existingAmountMap.get(m.key) || 0),
  }));
  const monthPlansWithRemaining = monthPlans.map((m) => {
    const remainingSumma = Math.max(
      0,
      Number(m.oySumma || 0) - Number(m.paidSumma || 0),
    );
    return {
      ...m,
      remainingSumma,
      isPaid: remainingSumma <= 0,
      isPartial: remainingSumma > 0 && Number(m.paidSumma || 0) > 0,
    };
  });

  const fullyDiscountedMonths = monthPlansWithRemaining
    .filter((m) => m.oySumma <= 0)
    .map((m) => m.key);

  const alreadyPaidMonthRows = monthPlansWithRemaining.filter((m) => m.isPaid);
  if (throwOnAlreadyPaid && alreadyPaidMonthRows.length) {
    throw new ApiError(
      409,
      "PAYMENT_MONTH_ALREADY_COVERED",
      "Tanlangan oylarning bir qismi oldin to'langan. Oylarni qayta tanlang.",
      {
        alreadyPaidMonths: alreadyPaidMonthRows.map((m) => m.key),
        alreadyPaidMonthsFormatted: alreadyPaidMonthRows.map((m) =>
          safeFormatMonthKey(m.key),
        ),
      },
    );
  }

  const appliedMonths = monthPlansWithRemaining.filter((m) => m.remainingSumma > 0);
  if (throwOnAlreadyPaid && !appliedMonths.length) {
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
    (acc, row) => acc + Number(row.remainingSumma || 0),
    0,
  );
  const finalSumma = resolvePaymentAmount({
    expectedSumma,
    requestedSumma,
  });

  let remainingToAllocate = finalSumma;
  const allocations = [];
  for (const month of appliedMonths) {
    if (remainingToAllocate <= 0) break;
    const allocate = Math.min(
      Number(month.remainingSumma || 0),
      Number(remainingToAllocate || 0),
    );
    if (allocate <= 0) continue;
    allocations.push({
      ...month,
      qoplamaSumma: allocate,
    });
    remainingToAllocate -= allocate;
  }

  if (throwOnAlreadyPaid && (!allocations.length || remainingToAllocate < 0)) {
    throw new ApiError(
      400,
      "PAYMENT_ALLOCATION_FAILED",
      "To'lov summasini oylar bo'yicha taqsimlab bo'lmadi",
    );
  }

  return {
    monthPlansWithRemaining,
    fullyDiscountedMonths,
    alreadyPaidMonths: alreadyPaidMonthRows.map((m) => m.key),
    alreadyPaidMonthRows,
    appliedMonths,
    expectedSumma,
    finalSumma,
    allocations,
    remainingToAllocate,
    appliedMonthKeys: allocations.map((m) => m.key),
  };
}

async function createStudentPayment(req, res) {
  const { studentId } = req.params;
  const settings = await getOrCreateSettings();
  const { startMonth, turi, requestedMonthsRaw, requestedSumma, idempotencyKey } =
    getPaymentRequestInput(req);
  const { oylarSoni, draftPlans } = await buildStudentPaymentDraftContext({
    studentId,
    settings,
    startMonth,
    turi,
    requestedMonthsRaw,
  });

  let paymentResult;
  try {
    paymentResult = await prisma.$transaction(async (tx) => {
      const allocationPreview = await buildPaymentAllocationPreview({
        prismaClient: tx,
        studentId,
        draftPlans,
        requestedSumma,
        throwOnAlreadyPaid: true,
      });
      const allocationsLocal = allocationPreview.allocations;
      const appliedMonthKeysLocal = allocationPreview.appliedMonthKeys;

      const created = await tx.tolovTranzaksiya.create({
        data: {
          studentId,
          adminUserId: req.user.sub,
          turi,
          summa: allocationPreview.finalSumma,
          izoh: req.body.izoh || null,
          idempotencyKey,
          tarifVersionId: settings.faolTarifId || null,
          tarifSnapshot: {
            oylikSumma: settings.oylikSumma,
            yillikSumma: settings.yillikSumma,
            tolovOylarSoni: readTarifTolovOylarSoni(settings),
            billingCalendar: readTarifBillingCalendar(settings),
            faolTarifId: settings.faolTarifId || null,
          },
        },
      });

      const inserted = await tx.tolovQoplama.createMany({
        data: allocationsLocal.map((m) => ({
          studentId,
          tranzaksiyaId: created.id,
          yil: m.yil,
          oy: m.oy,
          summa: Number(m.qoplamaSumma || 0),
        })),
      });

      if (inserted.count !== allocationsLocal.length) {
        throw new ApiError(
          409,
          "PAYMENT_MONTH_CONFLICT",
          "Tanlangan oylarning bir qismi boshqa to'lov bilan yopilgan. Sahifani yangilang va qayta urinib ko'ring.",
        );
      }

      await syncStudentOyMajburiyatlar({
        prismaClient: tx,
        studentIds: [studentId],
        oylikSumma: settings.oylikSumma,
        futureMonths: 3,
        chargeableMonths: readTarifChargeableMonths(settings),
      });

      return {
        transactionId: created.id,
        appliedMonthKeys: appliedMonthKeysLocal,
        allocations: allocationsLocal,
        expectedSumma: allocationPreview.expectedSumma,
        finalSumma: allocationPreview.finalSumma,
        fullyDiscountedMonths: allocationPreview.fullyDiscountedMonths,
      };
    });
  } catch (error) {
    if (
      idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApiError(
        409,
        "PAYMENT_DUPLICATE_REQUEST",
        "To'lov so'rovi takror yuborildi. Sahifani yangilang yoki bir necha soniyadan keyin qayta urinib ko'ring.",
      );
    }
    throw error;
  }

  res.status(201).json({
    ok: true,
    transactionId: paymentResult.transactionId,
    appliedMonths: paymentResult.appliedMonthKeys,
    appliedMonthsFormatted: paymentResult.appliedMonthKeys.map(safeFormatMonthKey),
    qismanTolov: paymentResult.finalSumma < paymentResult.expectedSumma,
    allocations: paymentResult.allocations.map((m) => ({
      key: m.key,
      yil: m.yil,
      oy: m.oy,
      oyLabel: safeFormatMonthKey(m.key),
      oldinTolangan: Number(m.paidSumma || 0),
      oyJami: Number(m.oySumma || 0),
      qoldiq: Number(m.remainingSumma || 0),
      tushganSumma: Number(m.qoplamaSumma || 0),
    })),
    skippedDiscountedMonths: paymentResult.fullyDiscountedMonths,
    skippedDiscountedMonthsFormatted: paymentResult.fullyDiscountedMonths.map((m) =>
      safeFormatMonthKey(m),
    ),
    summa: paymentResult.finalSumma,
    expectedSumma: paymentResult.expectedSumma,
    oylarSoni,
    turi,
  });
}

async function previewStudentPayment(req, res) {
  const { studentId } = req.params;
  const settings = await getOrCreateSettings();
  const { startMonth, turi, requestedMonthsRaw, requestedSumma } =
    getPaymentRequestInput(req);
  const {
    oylarSoni,
    draftPlans,
    enrollmentStartMonth,
    maxAllowedMonthKey,
    chargeableMonths,
  } =
    await buildStudentPaymentDraftContext({
      studentId,
      settings,
      startMonth,
      turi,
      requestedMonthsRaw,
    });
  const allocationPreview = await buildPaymentAllocationPreview({
    prismaClient: prisma,
    studentId,
    draftPlans,
    requestedSumma,
    throwOnAlreadyPaid: false,
  });

  res.json({
    ok: true,
    preview: {
      studentId,
      turi,
      startMonth,
      oylarSoni,
      monthsToClose: draftPlans.map((m) => m.key),
      previewMonthsCount: draftPlans.length,
      expectedSumma: allocationPreview.expectedSumma,
      finalSumma: allocationPreview.finalSumma,
      qismanTolov: allocationPreview.finalSumma < allocationPreview.expectedSumma,
      requestedSumma,
      canSubmit:
        allocationPreview.appliedMonths.length > 0 &&
        allocationPreview.allocations.length > 0 &&
        allocationPreview.remainingToAllocate >= 0,
      alreadyPaidMonths: allocationPreview.alreadyPaidMonths,
      alreadyPaidMonthsFormatted: allocationPreview.alreadyPaidMonths.map(safeFormatMonthKey),
      fullyDiscountedMonths: allocationPreview.fullyDiscountedMonths,
      fullyDiscountedMonthsFormatted: allocationPreview.fullyDiscountedMonths.map(safeFormatMonthKey),
      appliedMonths: allocationPreview.appliedMonthKeys,
      appliedMonthsFormatted: allocationPreview.appliedMonthKeys.map(safeFormatMonthKey),
      allocations: allocationPreview.allocations.map((m) => ({
        key: m.key,
        oyLabel: safeFormatMonthKey(m.key),
        yil: m.yil,
        oy: m.oy,
        oyJami: Number(m.oySumma || 0),
        oldinTolangan: Number(m.paidSumma || 0),
        qoldiq: Number(m.remainingSumma || 0),
        tushganSumma: Number(m.qoplamaSumma || 0),
        isPartialMonth: Boolean(m.isPartial),
      })),
      enrollmentStartMonth,
      enrollmentStartMonthFormatted: safeFormatMonthKey(enrollmentStartMonth),
      maxAllowedMonth: maxAllowedMonthKey,
      maxAllowedMonthFormatted: safeFormatMonthKey(maxAllowedMonthKey),
      chargeableMonths,
    },
  });
}

async function revertPayment(req, res) {
  const { tolovId } = req.params;
  const settings = await getOrCreateSettings();
  const txn = await prisma.tolovTranzaksiya.findUnique({
    where: { id: tolovId },
    include: {
      qoplamalar: { select: { yil: true, oy: true, summa: true } },
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
  const freedMonths = qoplamalardagiOylar;
  const freedAllocations = txn.qoplamalar.map((q) => ({
    key: `${q.yil}-${String(q.oy).padStart(2, "0")}`,
    yil: q.yil,
    oy: q.oy,
    summa: Number(q.summa || 0),
  }));

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

  await syncStudentOyMajburiyatlar({
    studentIds: [txn.studentId],
    oylikSumma: settings.oylikSumma,
    futureMonths: 3,
    chargeableMonths: readTarifChargeableMonths(settings),
  });

  res.json({
    ok: true,
    reverted: true,
    tolovId,
    freedMonths,
    freedMonthsFormatted: freedMonths.map(safeFormatMonthKey),
    freedAllocations: freedAllocations.map((row) => ({
      ...row,
      oyLabel: safeFormatMonthKey(row.key),
    })),
  });
}

module.exports = {
  // queries
  getOrCreateSettings,
  fetchFinancePageRows,
  fetchAllFinanceRows,
  // orchestrators
  fetchFinanceSummary,
  buildFinanceSettingsPayload,
  // handlers
  getFinanceSettings,
  upsertFinanceSettings,
  rollbackFinanceTarif,
  getFinanceStudents,
  exportDebtorsXlsx,
  exportDebtorsPdf,
  getStudentFinanceDetail,
  createStudentImtiyoz,
  deactivateStudentImtiyoz,
  previewStudentPayment,
  createStudentPayment,
  revertPayment,
};
