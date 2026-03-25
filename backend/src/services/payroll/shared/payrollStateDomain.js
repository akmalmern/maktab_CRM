function createPayrollStateDomain({ ApiError, money, DECIMAL_ZERO }) {
  function clampPaidAmountToPayable(paidAmount, payableAmount) {
    const payable = money(payableAmount);
    if (payable.lte(DECIMAL_ZERO)) return DECIMAL_ZERO;

    const paid = money(paidAmount);
    if (paid.lte(DECIMAL_ZERO)) return DECIMAL_ZERO;
    if (paid.gte(payable)) return payable;
    return paid;
  }

  function getPayrollItemPaymentStatus({ paidAmount, payableAmount }) {
    const payable = money(payableAmount);
    if (payable.lte(DECIMAL_ZERO)) return "PAID";

    const paid = clampPaidAmountToPayable(paidAmount, payable);
    if (paid.lte(DECIMAL_ZERO)) return "UNPAID";
    if (paid.gte(payable)) return "PAID";
    return "PARTIAL";
  }

  function assertRunStatus(run, allowed) {
    if (!allowed.includes(run.status)) {
      throw new ApiError(
        409,
        "PAYROLL_INVALID_STATE",
        `Bu amal faqat ${allowed.join(", ")} holatida mumkin (hozir: ${run.status})`,
        { currentStatus: run.status, allowed },
      );
    }
  }

  return {
    clampPaidAmountToPayable,
    getPayrollItemPaymentStatus,
    assertRunStatus,
  };
}

module.exports = {
  createPayrollStateDomain,
};
