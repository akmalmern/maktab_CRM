const { Prisma } = require("@prisma/client");
const prisma = require("../../../../prisma");
const { ApiError } = require("../../../../utils/apiError");
const {
  monthKeyFromDate,
  monthKeyFromParts,
  buildMonthRange,
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
  getOrCreateMainFinanceSettings,
} = require("../../../../services/financeSettingsService");
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
  normalizeClassroomFilterInput: normalizeClassroomFilterInputShared,
} = require("../shared/filters");
const { createPdfBuffer: createPdfBufferShared } = require("../shared/pdf");
const {
  mapTarifRow: mapTarifRowShared,
  mapTarifAuditRow: mapTarifAuditRowShared,
} = require("../shared/tarifMappers");
const {
  fetchFinanceSummaryAggregate,
  fetchFinanceTopDebtors,
  fetchFinanceTopDebtorClassrooms,
  fetchFilteredMonthlyPlanAggregate,
  fetchFilteredPaidAmounts,
} = require("../repositories/financeDebtRepository");
const {
  findStudentFinanceProfile,
  findStudentBasic,
  fetchStudentFinanceMajburiyatRows,
  fetchStudentImtiyozRows,
  fetchStudentPaymentTransactions,
  fetchStudentPaymentDraftStudent,
  fetchStudentPaymentCoverageRows,
  findStudentImtiyozById,
} = require("../repositories/financeStudentRepository");
const {
  fetchFinancePayrollCashflowRows,
  fetchFinanceCashflowPlanInputs,
} = require("../repositories/financeCashflowRepository");
const {
  executeFetchFinancePageRows,
} = require("../useCases/fetchFinancePageRows");
const {
  executeProcessFinanceRowsInBatches,
} = require("../useCases/processFinanceRowsInBatches");
const {
  executeFetchFinanceSummary,
} = require("../useCases/fetchFinanceSummary");
const {
  executeCalculateFinanceCashflow,
} = require("../useCases/calculateFinanceCashflow");
const {
  executeExportDebtorsXlsx,
} = require("../useCases/exportDebtorsXlsx");
const {
  executeExportDebtorsPdf,
} = require("../useCases/exportDebtorsPdf");
const {
  executeFetchStudentFinanceDetail,
} = require("../useCases/fetchStudentFinanceDetail");
const {
  executeCreateStudentImtiyoz,
} = require("../useCases/createStudentImtiyoz");
const {
  executeDeactivateStudentImtiyoz,
} = require("../useCases/deactivateStudentImtiyoz");
const {
  executePreviewStudentPayment,
} = require("../useCases/previewStudentPayment");
const {
  executeCreateStudentPayment,
} = require("../useCases/createStudentPayment");
const {
  getPaymentRequestInput,
  getPartialRevertRequestInput,
} = require("../useCases/studentPaymentShared");
const { utcDateToTashkentIsoDate } = require("../../../../utils/tashkentTime");
const {
  resolveManagerScopedClassroomFilter,
  ensureManagerCanAccessStudent,
} = require("../../../../services/managerScopeService");

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

function buildWhereSql({ search, classroomId, classroomIds }) {
  return buildWhereSqlShared({ search, classroomId, classroomIds });
}

function normalizeClassroomFilterInput(value) {
  return normalizeClassroomFilterInputShared(value);
}

function parseDebtTargetMonth(value) {
  return parseDebtTargetMonthShared(value);
}

async function fetchFinanceScopedStudentIds({
  search,
  classroomId,
  classroomIds,
}) {
  const whereSql = buildWhereSql({ search, classroomId, classroomIds });
  const rows = await prisma.$queryRaw`
    WITH active_enrollment AS (
      SELECT DISTINCT ON (e."studentId")
        e."studentId",
        e."classroomId"
      FROM "Enrollment" e
      WHERE e."isActive" = true
      ORDER BY e."studentId", e."createdAt" DESC
    )
    SELECT s.id
    FROM "Student" s
    LEFT JOIN "User" u ON u.id = s."userId"
    LEFT JOIN active_enrollment ae ON ae."studentId" = s.id
    ${whereSql}
    ORDER BY s.id ASC
  `;
  return rows.map((row) => row.id);
}

function buildFinanceDeps() {
  return {
    Prisma,
    prisma,
    ApiError,
    buildWhereSql,
    summarizeDebtFromMajburiyatRows,
    mapStudentRowFromRaw,
    monthKeyFromDate,
    fetchFinanceScopedStudentIds,
    fetchFinanceSummaryAggregate,
    fetchFinanceTopDebtors,
    fetchFinanceTopDebtorClassrooms,
    fetchFilteredMonthlyPlanAggregate,
    fetchFilteredPaidAmounts,
    findStudentFinanceProfile,
    findStudentBasic,
    fetchStudentFinanceMajburiyatRows,
    fetchStudentImtiyozRows,
    fetchStudentPaymentTransactions,
    fetchStudentPaymentDraftStudent,
    fetchStudentPaymentCoverageRows,
    findStudentImtiyozById,
    fetchFinancePayrollCashflowRows,
    fetchFinanceCashflowPlanInputs,
    parseDebtTargetMonth,
    readTarifTolovOylarSoni,
    readTarifChargeableMonths,
    readTarifBillingCalendar,
    safeFormatMonthKey,
    isMonthChargeableForTarif,
    buildImtiyozMonthMap,
    buildImtiyozSnapshotRows,
    parseImtiyozStartPartsFromKey,
    resolvePaymentPlan,
    resolvePaymentAmount,
    buildMonthRange,
    monthKeyFromParts,
    monthKeyToSerial,
    startOfMonthUtc,
    syncStudentOyMajburiyatlar,
    ensureManagerCanAccessStudent,
    getTashkentLocalMonthStartDateUtc,
    mapImtiyozRow,
    nextMonthStart,
    calculateFinanceCashflow: (params) =>
      executeCalculateFinanceCashflow({
        deps: buildFinanceDeps(),
        ...params,
      }),
    createPdfBuffer,
    processFinanceRowsInBatches: (params) =>
      executeProcessFinanceRowsInBatches({
        deps: buildFinanceDeps(),
        ...params,
      }),
    fetchFinancePageRows: (params) =>
      executeFetchFinancePageRows({
        deps: buildFinanceDeps(),
        ...params,
      }),
  };
}

async function fetchFinancePageRows({
  search,
  classroomId,
  classroomIds,
  status = "ALL",
  debtMonth = "ALL",
  debtTargetMonth,
  page,
  limit,
  settings,
}) {
  return executeFetchFinancePageRows({
    deps: buildFinanceDeps(),
    search,
    classroomId,
    classroomIds,
    status,
    debtMonth,
    debtTargetMonth,
    page,
    limit,
    settings,
  });
}

async function fetchFinanceSummary({
  search,
  classroomId,
  classroomIds,
  status,
  debtMonth,
  debtTargetMonth,
  cashflowMonth,
  settings,
}) {
  return executeFetchFinanceSummary({
    deps: buildFinanceDeps(),
    search,
    classroomId,
    classroomIds,
    status,
    debtMonth,
    debtTargetMonth,
    cashflowMonth,
    settings,
  });
}

async function processFinanceRowsInBatches({
  search,
  classroomId,
  classroomIds,
  status = "ALL",
  debtMonth = "ALL",
  debtTargetMonth = null,
  settings,
  batchSize = 500,
  onBatch,
}) {
  return executeProcessFinanceRowsInBatches({
    deps: buildFinanceDeps(),
    search,
    classroomId,
    classroomIds,
    status,
    debtMonth,
    debtTargetMonth,
    settings,
    batchSize,
    onBatch,
  });
}

async function fetchAllFinanceRows({
  search,
  classroomId,
  classroomIds,
  status = "ALL",
  debtMonth = "ALL",
  debtTargetMonth = null,
  settings,
  maxRows = 10_000,
}) {
  const safeMaxRows = Math.max(1, Number(maxRows || 10_000));
  const all = [];
  await processFinanceRowsInBatches({
    search,
    classroomId,
    classroomIds,
    status,
    debtMonth,
    debtTargetMonth,
    settings,
    batchSize: 500,
    onBatch: async (items) => {
      if (all.length + items.length > safeMaxRows) {
        throw new ApiError(
          413,
          "FINANCE_DATASET_TOO_LARGE",
          `Finance dataset too large for in-memory export (${safeMaxRows}+ rows)`,
        );
      }
      all.push(...items);
    },
  });
  return all;
}

async function createPdfBuffer(textLines) {
  return createPdfBufferShared(textLines);
}

async function getOrCreateSettings() {
  return getOrCreateMainFinanceSettings({ prismaClient: prisma });
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
      thisMonthPayrollPayoutAmount: Number(summary.cashflow?.payrollPayoutAmount || 0),
      thisMonthPayrollNetAmount: Number(summary.cashflow?.payrollNetAmount || 0),
      thisMonthNetCashflowAmount: Number(summary.cashflow?.netAmount || 0),
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
  const requestedClassroomId = normalizeClassroomFilterInput(req.query.classroomId);
  const debtMonth = req.query.debtMonth || "ALL";
  const debtTargetMonth = parseDebtTargetMonth(req.query.debtTargetMonth);
  const cashflowMonth = parseDebtTargetMonth(req.query.cashflowMonth);
  const scopedClassroom = req.user?.role === "MANAGER"
    ? await resolveManagerScopedClassroomFilter({
        managerUserId: req.user.sub,
        requestedClassroomId,
      })
    : {
        classroomId: requestedClassroomId,
        classroomIds: null,
      };
  const classroomId = scopedClassroom.classroomId;
  const classroomIds = scopedClassroom.classroomIds;

  const settings = await getOrCreateSettings();
  const pageResult = await fetchFinancePageRows({
    search,
    classroomId,
    classroomIds,
    status,
    debtMonth,
    debtTargetMonth,
    page,
    limit,
    settings,
  });
  const summary = await fetchFinanceSummary({
    search,
    classroomId,
    classroomIds,
    status,
    debtMonth,
    debtTargetMonth,
    cashflowMonth,
    settings,
  });

  res.json({
    ok: true,
    page,
    limit,
    total: pageResult.total,
    pages: pageResult.pages,
    settings: {
      oylikSumma: settings.oylikSumma,
      yillikSumma: settings.yillikSumma,
      tolovOylarSoni: readTarifTolovOylarSoni(settings),
      billingCalendar: readTarifBillingCalendar(settings),
      faolTarifId: settings.faolTarifId || null,
    },
    summary,
    students: pageResult.items,
  });
}

async function exportDebtorsXlsx(req, res) {
  const search = String(req.query.search || "").trim();
  const classroomId = normalizeClassroomFilterInput(req.query.classroomId);
  const result = await executeExportDebtorsXlsx({
    deps: buildFinanceDeps(),
    search,
    classroomId,
    classroomIds: null,
  });
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.send(result.buffer);
}

async function exportDebtorsPdf(req, res) {
  const search = String(req.query.search || "").trim();
  const classroomId = normalizeClassroomFilterInput(req.query.classroomId);
  const result = await executeExportDebtorsPdf({
    deps: buildFinanceDeps(),
    search,
    classroomId,
    classroomIds: null,
    res,
  });
  if (result?.streamed) return;
}

async function getStudentFinanceDetail(req, res) {
  const result = await executeFetchStudentFinanceDetail({
    deps: buildFinanceDeps(),
    actor: req.user,
    studentId: req.params.studentId,
  });

  res.json({
    ok: true,
    ...result,
  });
}

async function createStudentImtiyoz(req, res) {
  const result = await executeCreateStudentImtiyoz({
    deps: buildFinanceDeps(),
    actor: req.user,
    studentId: req.params.studentId,
    settings: await getOrCreateSettings(),
    turi: req.body.turi,
    qiymat: req.body.qiymat,
    boshlanishOy: req.body.boshlanishOy,
    oylarSoni: req.body.oylarSoni,
    sabab: req.body.sabab,
    izoh: req.body.izoh,
  });

  res.status(201).json({
    ok: true,
    imtiyoz: result.imtiyoz,
    qoplanganOylar: result.appliedMonthKeys,
    qoplanganOylarFormatted: result.appliedMonthKeysFormatted,
  });
}

async function deactivateStudentImtiyoz(req, res) {
  const result = await executeDeactivateStudentImtiyoz({
    deps: buildFinanceDeps(),
    actor: req.user,
    imtiyozId: req.params.imtiyozId,
    sabab: req.body?.sabab || null,
    settings: await getOrCreateSettings(),
  });

  res.json({
    ok: true,
    imtiyoz: result.imtiyoz,
  });
}


async function createStudentPayment(req, res) {
  const input = getPaymentRequestInput({
    body: req.body,
    fallbackStartMonth: monthKeyFromDate(new Date()),
  });
  const result = await executeCreateStudentPayment({
    deps: buildFinanceDeps(),
    actor: req.user,
    studentId: req.params.studentId,
    settings: await getOrCreateSettings(),
    startMonth: input.startMonth,
    turi: input.turi,
    requestedMonthsRaw: input.requestedMonthsRaw,
    requestedSumma: input.requestedSumma,
    idempotencyKey: input.idempotencyKey,
    izoh: req.body.izoh || null,
  });

  res.status(201).json({
    ok: true,
    ...result,
  });
}

async function previewStudentPayment(req, res) {
  const input = getPaymentRequestInput({
    body: req.body,
    fallbackStartMonth: monthKeyFromDate(new Date()),
  });
  const preview = await executePreviewStudentPayment({
    deps: buildFinanceDeps(),
    actor: req.user,
    studentId: req.params.studentId,
    settings: await getOrCreateSettings(),
    startMonth: input.startMonth,
    turi: input.turi,
    requestedMonthsRaw: input.requestedMonthsRaw,
    requestedSumma: input.requestedSumma,
  });

  res.json({
    ok: true,
    preview,
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
  if (req.user?.role === "MANAGER") {
    await ensureManagerCanAccessStudent({
      managerUserId: req.user.sub,
      studentId: txn.studentId,
    });
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

async function partialRevertPayment(req, res) {
  const { tolovId } = req.params;
  const { refundSumma, sabab } = getPartialRevertRequestInput(req.body);

  if (!Number.isFinite(refundSumma) || !Number.isInteger(refundSumma) || refundSumma <= 0) {
    throw new ApiError(
      400,
      "PAYMENT_PARTIAL_REVERT_SUMMA_INVALID",
      "Qisman qaytarish summasi musbat butun son bo'lishi kerak",
    );
  }

  const settings = await getOrCreateSettings();
  const accessTxn = await prisma.tolovTranzaksiya.findUnique({
    where: { id: tolovId },
    select: { studentId: true },
  });

  if (!accessTxn) {
    throw new ApiError(404, "PAYMENT_NOT_FOUND", "To'lov topilmadi");
  }
  if (req.user?.role === "MANAGER") {
    await ensureManagerCanAccessStudent({
      managerUserId: req.user.sub,
      studentId: accessTxn.studentId,
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const txn = await tx.tolovTranzaksiya.findUnique({
      where: { id: tolovId },
      include: {
        qoplamalar: {
          select: { id: true, yil: true, oy: true, summa: true },
          orderBy: [{ yil: "desc" }, { oy: "desc" }],
        },
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

    const currentTxnSumma = Number(txn.summa || 0);
    if (refundSumma >= currentTxnSumma) {
      throw new ApiError(
        400,
        "PAYMENT_PARTIAL_REVERT_SUMMA_TOO_HIGH",
        "Qisman qaytarish summasi to'lov summasidan kichik bo'lishi kerak",
        { currentSumma: currentTxnSumma },
      );
    }

    const totalAllocated = txn.qoplamalar.reduce(
      (acc, row) => acc + Math.max(0, Number(row.summa || 0)),
      0,
    );
    if (refundSumma > totalAllocated) {
      throw new ApiError(
        409,
        "PAYMENT_PARTIAL_REVERT_ALLOCATION_FAILED",
        "Qisman qaytarishni qoplamalar bo'yicha taqsimlab bo'lmadi",
        { totalAllocated },
      );
    }

    let remaining = refundSumma;
    const updateRows = [];
    const deleteIds = [];
    const refundedAllocations = [];

    for (const row of txn.qoplamalar) {
      if (remaining <= 0) break;
      const rowSumma = Math.max(0, Number(row.summa || 0));
      if (rowSumma <= 0) continue;

      const refundFromRow = Math.min(rowSumma, remaining);
      const nextSumma = rowSumma - refundFromRow;
      const key = `${row.yil}-${String(row.oy).padStart(2, "0")}`;

      refundedAllocations.push({
        key,
        yil: row.yil,
        oy: row.oy,
        summa: refundFromRow,
      });

      if (nextSumma <= 0) {
        deleteIds.push(row.id);
      } else {
        updateRows.push({ id: row.id, summa: nextSumma });
      }

      remaining -= refundFromRow;
    }

    if (remaining > 0) {
      throw new ApiError(
        409,
        "PAYMENT_PARTIAL_REVERT_ALLOCATION_FAILED",
        "Qisman qaytarishni qoplamalar bo'yicha yakunlab bo'lmadi",
        { remaining },
      );
    }

    if (deleteIds.length) {
      await tx.tolovQoplama.deleteMany({
        where: { id: { in: deleteIds } },
      });
    }

    for (const row of updateRows) {
      await tx.tolovQoplama.update({
        where: { id: row.id },
        data: { summa: row.summa },
      });
    }

    const updateData = {
      summa: currentTxnSumma - refundSumma,
    };
    if (sabab) {
      updateData.izoh = [txn.izoh, `[PARTIAL_REVERT ${refundSumma}] ${sabab}`]
        .filter(Boolean)
        .join("\n");
    }

    const updatedTxn = await tx.tolovTranzaksiya.update({
      where: { id: tolovId },
      data: updateData,
      select: { summa: true, studentId: true },
    });

    await syncStudentOyMajburiyatlar({
      prismaClient: tx,
      studentIds: [updatedTxn.studentId],
      oylikSumma: settings.oylikSumma,
      futureMonths: 3,
      chargeableMonths: readTarifChargeableMonths(settings),
    });

    return {
      remainingSumma: Number(updatedTxn.summa || 0),
      refundedAllocations,
    };
  });

  const refundedMonthKeys = Array.from(new Set(result.refundedAllocations.map((row) => row.key)));

  res.json({
    ok: true,
    partialReverted: true,
    tolovId,
    refundedSumma: refundSumma,
    remainingSumma: result.remainingSumma,
    sabab,
    refundedMonths: refundedMonthKeys,
    refundedMonthsFormatted: refundedMonthKeys.map(safeFormatMonthKey),
    refundedAllocations: result.refundedAllocations.map((row) => ({
      ...row,
      oyLabel: safeFormatMonthKey(row.key),
    })),
  });
}

module.exports = {
  // queries
  getOrCreateSettings,
  fetchFinancePageRows,
  processFinanceRowsInBatches,
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
  partialRevertPayment,
};
