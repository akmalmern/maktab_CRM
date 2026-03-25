function createPayrollScalarUtils({ Prisma, DECIMAL_ZERO }) {
  function cleanOptional(value) {
    if (value === undefined || value === null) return undefined;
    const str = String(value).trim();
    return str.length ? str : undefined;
  }

  function decimal(value) {
    if (value instanceof Prisma.Decimal) return value;
    if (value === undefined || value === null) return DECIMAL_ZERO;
    return new Prisma.Decimal(value);
  }

  function money(value) {
    return decimal(value).toDecimalPlaces(2);
  }

  return {
    cleanOptional,
    decimal,
    money,
  };
}

module.exports = {
  createPayrollScalarUtils,
};
