const prisma = require("../prisma");

const DEFAULT_OYLIK_SUMMA = 300000;
const DEFAULT_TOLOV_OYLAR_SONI = 10;
const DEFAULT_YILLIK_SUMMA = DEFAULT_OYLIK_SUMMA * DEFAULT_TOLOV_OYLAR_SONI;
const SCHOOL_MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

function normalizeTolovOylarSoni(value, fallback = DEFAULT_TOLOV_OYLAR_SONI) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const intVal = Math.trunc(num);
  if (intVal < 1 || intVal > 12) return fallback;
  return intVal;
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

async function ensureMainFinanceSettings({ prismaClient = prisma } = {}) {
  await prismaClient.moliyaSozlama.upsert({
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

  return prismaClient.moliyaSozlama.findUnique({ where: { key: "MAIN" } });
}

async function checkAndActivateTariffs({
  prismaClient = prisma,
  now = new Date(),
} = {}) {
  await ensureMainFinanceSettings({ prismaClient });

  const dueTarif = await prismaClient.moliyaTarifVersion.findFirst({
    where: {
      holat: "REJALANGAN",
      boshlanishSana: { lte: now },
    },
    orderBy: [{ boshlanishSana: "desc" }, { createdAt: "desc" }],
  });

  if (!dueTarif) {
    return { activated: false, tarifId: null };
  }

  await prismaClient.$transaction(async (tx) => {
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

  return {
    activated: true,
    tarifId: dueTarif.id,
    startedAt: dueTarif.boshlanishSana,
  };
}

async function getOrCreateMainFinanceSettings({ prismaClient = prisma } = {}) {
  await ensureMainFinanceSettings({ prismaClient });
  await checkAndActivateTariffs({ prismaClient });
  return prismaClient.moliyaSozlama.findUnique({ where: { key: "MAIN" } });
}

module.exports = {
  DEFAULT_OYLIK_SUMMA,
  DEFAULT_TOLOV_OYLAR_SONI,
  DEFAULT_YILLIK_SUMMA,
  buildDefaultBillingCalendar,
  normalizeTolovOylarSoni,
  readTarifTolovOylarSoni,
  readTarifBillingCalendar,
  ensureMainFinanceSettings,
  checkAndActivateTariffs,
  getOrCreateMainFinanceSettings,
};
