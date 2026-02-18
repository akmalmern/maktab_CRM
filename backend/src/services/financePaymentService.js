const { ApiError } = require("../utils/apiError");

const MAX_OYLAR_SONI = 36;

function resolvePaymentPlan({ turi, oylarSoniRaw, summaRaw, settings }) {
  const hasSumma = Number.isFinite(summaRaw);
  const requestedMonths = Number.isFinite(oylarSoniRaw) ? oylarSoniRaw : null;

  if (turi === "YILLIK") {
    if (requestedMonths !== null && requestedMonths !== 12) {
      throw new ApiError(400, "YILLIK_MONTHS_INVALID", "Yillik to'lovda oylar soni 12 bo'lishi kerak");
    }

    const oylarSoni = 12;
    const expectedSumma = settings.yillikSumma;
    const summa = hasSumma ? summaRaw : expectedSumma;

    if (summa !== expectedSumma) {
      throw new ApiError(
        400,
        "PAYMENT_AMOUNT_MISMATCH",
        `Yillik to'lov summasi ${expectedSumma} bo'lishi kerak`,
        { expectedSumma, requestedSumma: summa },
      );
    }

    return { oylarSoni, summa, expectedSumma };
  }

  if (turi === "IXTIYORIY") {
    if (!hasSumma) {
      throw new ApiError(400, "SUMMA_REQUIRED", "Ixtiyoriy to'lov uchun summa majburiy");
    }

    if (summaRaw % settings.oylikSumma !== 0) {
      throw new ApiError(
        400,
        "IXTIYORIY_SUMMA_INVALID",
        "Ixtiyoriy summa oylik summaning karralisi bo'lishi kerak",
      );
    }

    const inferredMonths = summaRaw / settings.oylikSumma;
    if (inferredMonths < 1 || inferredMonths > MAX_OYLAR_SONI) {
      throw new ApiError(
        400,
        "IXTIYORIY_MONTHS_INVALID",
        `Ixtiyoriy to'lov oylar soni 1 dan ${MAX_OYLAR_SONI} gacha bo'lishi kerak`,
      );
    }

    if (requestedMonths !== null && requestedMonths !== inferredMonths) {
      throw new ApiError(
        400,
        "IXTIYORIY_MONTHS_MISMATCH",
        "Ixtiyoriy to'lovda oylar soni summa bilan mos kelmadi",
        { expectedMonths: inferredMonths, requestedMonths },
      );
    }

    return {
      oylarSoni: inferredMonths,
      summa: summaRaw,
      expectedSumma: summaRaw,
    };
  }

  const oylarSoni = requestedMonths ?? 1;
  if (oylarSoni < 1 || oylarSoni > MAX_OYLAR_SONI) {
    throw new ApiError(
      400,
      "INVALID_MONTH_COUNT",
      `Oylar soni 1 dan ${MAX_OYLAR_SONI} gacha bo'lishi kerak`,
    );
  }

  const expectedSumma = settings.oylikSumma * oylarSoni;
  const summa = hasSumma ? summaRaw : expectedSumma;
  if (summa !== expectedSumma) {
    throw new ApiError(
      400,
      "PAYMENT_AMOUNT_MISMATCH",
      `Ushbu to'lov uchun summa ${expectedSumma} bo'lishi kerak`,
      { expectedSumma, requestedSumma: summa },
    );
  }

  return { oylarSoni, summa, expectedSumma };
}

module.exports = {
  MAX_OYLAR_SONI,
  resolvePaymentPlan,
};
