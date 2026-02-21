const { ApiError } = require("../utils/apiError");
const { buildMonthRange } = require("./financeDebtService");

const MAX_OYLAR_SONI = 36;

function resolvePaymentMonthCount({ turi, oylarSoniRaw }) {
  const requestedMonths = Number.isFinite(oylarSoniRaw)
    ? oylarSoniRaw
    : null;

  if (turi === "YILLIK") {
    if (requestedMonths !== null && requestedMonths !== 12) {
      throw new ApiError(
        400,
        "YILLIK_MONTHS_INVALID",
        "Yillik to'lovda oylar soni 12 bo'lishi kerak",
      );
    }
    return 12;
  }

  const oylarSoni = requestedMonths ?? 1;
  if (oylarSoni < 1 || oylarSoni > MAX_OYLAR_SONI) {
    throw new ApiError(
      400,
      "INVALID_MONTH_COUNT",
      `Oylar soni 1 dan ${MAX_OYLAR_SONI} gacha bo'lishi kerak`,
    );
  }
  return oylarSoni;
}

function resolvePaymentAmount({ expectedSumma, requestedSumma }) {
  const hasRequestedSumma = Number.isFinite(requestedSumma);
  const finalSumma = hasRequestedSumma ? Number(requestedSumma) : expectedSumma;

  if (finalSumma !== expectedSumma) {
    throw new ApiError(
      400,
      "PAYMENT_AMOUNT_MISMATCH",
      `Tanlangan oylar uchun to'lov summasi ${expectedSumma} bo'lishi kerak`,
      {
        expectedSumma,
        requestedSumma: finalSumma,
      },
    );
  }
  return finalSumma;
}

function resolvePaymentPlan({
  turi,
  startMonth,
  oylarSoniRaw,
  monthAmountByKey = new Map(),
  defaultMonthAmount,
}) {
  const oylarSoni = resolvePaymentMonthCount({
    turi,
    oylarSoniRaw,
  });
  const months = buildMonthRange(startMonth, oylarSoni);
  const monthPlans = months.map((m) => {
    const key = `${m.yil}-${String(m.oy).padStart(2, "0")}`;
    return {
      key,
      yil: m.yil,
      oy: m.oy,
      oySumma: Number(
        monthAmountByKey.has(key)
          ? monthAmountByKey.get(key)
          : defaultMonthAmount,
      ),
    };
  });

  return { oylarSoni, monthPlans };
}

module.exports = {
  MAX_OYLAR_SONI,
  resolvePaymentMonthCount,
  resolvePaymentAmount,
  resolvePaymentPlan,
};
