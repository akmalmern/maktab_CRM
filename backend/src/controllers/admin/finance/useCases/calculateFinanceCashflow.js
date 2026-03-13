async function executeCalculateFinanceCashflow({
  deps,
  cohortStudentIds,
  settings,
  cashflowMonthKey,
  currentMonthKey,
  selectedMonthKey,
  thisMonthDebtAmount,
  selectedMonthDebtAmount,
}) {
  const {
    parseDebtTargetMonth,
    safeFormatMonthKey,
    startOfMonthUtc,
    isMonthChargeableForTarif,
    buildImtiyozMonthMap,
    fetchFinancePayrollCashflowRows,
    fetchFinanceCashflowPlanInputs,
  } = deps;

  const parsedCashflowMonth = parseDebtTargetMonth(cashflowMonthKey);
  const cashflowMonthStart = new Date(
    Date.UTC(parsedCashflowMonth.year, parsedCashflowMonth.month - 1, 1),
  );
  const cashflowMonthEnd = new Date(
    Date.UTC(parsedCashflowMonth.year, parsedCashflowMonth.month, 1),
  );

  const payrollCashflowRows = await fetchFinancePayrollCashflowRows({
    monthStart: cashflowMonthStart,
    monthEnd: cashflowMonthEnd,
  });
  const payrollCashByType = new Map(
    payrollCashflowRows.map((row) => [row.entryType, Number(row?._sum?.amount || 0)]),
  );
  const payrollPayoutAmount = Math.abs(
    Number(payrollCashByType.get("PAYROLL_PAYOUT") || 0),
  );
  const payrollReversalAmount = Number(payrollCashByType.get("PAYROLL_REVERSAL") || 0);
  const payrollNetAmount = payrollCashflowRows.reduce(
    (acc, row) => acc + Number(row?._sum?.amount || 0),
    0,
  );

  const {
    students: planStudents,
    imtiyozRows: cashflowImtiyozRows,
    collectedAmount: cashflowCollectedAmount,
  } = await fetchFinanceCashflowPlanInputs({
    studentIds: cohortStudentIds,
    monthStart: cashflowMonthStart,
    monthEnd: cashflowMonthEnd,
  });

  let cashflowPlanAmount = 0;
  if (planStudents.length) {
    const imtiyozGrouped = new Map();
    for (const row of cashflowImtiyozRows) {
      if (!imtiyozGrouped.has(row.studentId)) imtiyozGrouped.set(row.studentId, []);
      imtiyozGrouped.get(row.studentId).push(row);
    }

    const cashflowMonthChargeable = isMonthChargeableForTarif(settings, cashflowMonthKey);
    for (const student of planStudents) {
      const startDate = student.enrollments?.[0]?.startDate || student.createdAt;
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
  }

  const debtAmount =
    cashflowMonthKey === currentMonthKey
      ? thisMonthDebtAmount
      : selectedMonthKey
        ? selectedMonthDebtAmount
        : 0;
  const diffAmount = cashflowPlanAmount - cashflowCollectedAmount;
  const netAmount = cashflowCollectedAmount + payrollNetAmount;

  return {
    month: cashflowMonthKey,
    monthFormatted: safeFormatMonthKey(cashflowMonthKey),
    planAmount: cashflowPlanAmount,
    collectedAmount: cashflowCollectedAmount,
    payrollPayoutAmount,
    payrollReversalAmount,
    payrollNetAmount,
    netAmount,
    debtAmount,
    diffAmount,
  };
}

module.exports = {
  executeCalculateFinanceCashflow,
};
