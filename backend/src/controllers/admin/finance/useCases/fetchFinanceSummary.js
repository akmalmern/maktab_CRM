async function executeFetchFinanceSummary({
  deps,
  search,
  classroomId,
  classroomIds,
  status,
  debtMonth,
  debtTargetMonth,
  cashflowMonth,
  settings,
}) {
  const {
    monthKeyFromDate,
    fetchFinanceScopedStudentIds,
    fetchFinanceSummaryAggregate,
    fetchFinanceTopDebtors,
    fetchFinanceTopDebtorClassrooms,
    fetchFilteredMonthlyPlanAggregate,
    fetchFilteredPaidAmounts,
    readTarifTolovOylarSoni,
    startOfMonthUtc,
    nextMonthStart,
    calculateFinanceCashflow,
  } = deps;

  const now = new Date();
  const currentMonthKey = monthKeyFromDate(now);
  const selectedMonthKey = debtTargetMonth?.key || null;
  const selectedYear = debtTargetMonth?.year || null;
  const selectedMonth = debtTargetMonth?.month || null;
  const cashflowMonthKey = cashflowMonth?.key || selectedMonthKey || currentMonthKey;

  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const previousDate = new Date(Date.UTC(currentYear, currentMonth - 2, 1));
  const previousYear = previousDate.getUTCFullYear();
  const previousMonth = previousDate.getUTCMonth() + 1;

  const cohortStudentIds = await fetchFinanceScopedStudentIds({
    search,
    classroomId,
    classroomIds,
  });

  const [summaryAggregate, topDebtorsRaw, topDebtorClassroomsRaw, monthlyPlanRow] =
    await Promise.all([
      fetchFinanceSummaryAggregate({
        search,
        classroomId,
        classroomIds,
        status,
        debtMonth,
        targetYear: selectedYear,
        targetMonth: selectedMonth,
        currentYear,
        currentMonth,
        previousYear,
        previousMonth,
      }),
      fetchFinanceTopDebtors({
        search,
        classroomId,
        classroomIds,
        status,
        debtMonth,
        targetYear: selectedYear,
        targetMonth: selectedMonth,
        currentYear,
        currentMonth,
        previousYear,
        previousMonth,
        limit: 10,
      }),
      fetchFinanceTopDebtorClassrooms({
        search,
        classroomId,
        classroomIds,
        status,
        debtMonth,
        targetYear: selectedYear,
        targetMonth: selectedMonth,
        currentYear,
        currentMonth,
        previousYear,
        previousMonth,
        limit: 10,
      }),
      fetchFilteredMonthlyPlanAggregate({
        search,
        classroomId,
        classroomIds,
        status,
        debtMonth,
        targetYear: selectedYear,
        targetMonth: selectedMonth,
        currentYear,
        currentMonth,
        previousYear,
        previousMonth,
      }),
    ]);

  const totalRows = Number(summaryAggregate.totalRows || 0);
  const totalDebtors = Number(summaryAggregate.totalDebtors || 0);
  const totalDebtAmount = Number(summaryAggregate.totalDebtAmount || 0);
  const thisMonthDebtors = Number(summaryAggregate.thisMonthDebtors || 0);
  const previousMonthDebtors = Number(summaryAggregate.previousMonthDebtors || 0);
  const selectedMonthDebtors = Number(summaryAggregate.selectedMonthDebtors || 0);
  const thisMonthDebtAmount = Number(summaryAggregate.thisMonthDebtAmount || 0);
  const previousMonthDebtAmount = Number(summaryAggregate.previousMonthDebtAmount || 0);
  const selectedMonthDebtAmount = Number(summaryAggregate.selectedMonthDebtAmount || 0);
  const monthlyPlanAmount = Number(monthlyPlanRow.monthlyPlanAmount || 0);

  const topDebtors = (topDebtorsRaw || []).map((row) => ({
    studentId: row.studentId,
    fullName: String(row.fullName || "").trim() || row.username || row.studentId,
    username: row.username || "-",
    classroomId: row.classroomId || null,
    classroom: row.classroom || "-",
    totalDebtAmount: Number(row.totalDebtAmount || 0),
    thisMonthDebtAmount: Number(row.thisMonthDebtAmount || 0),
    previousMonthDebtAmount: Number(row.previousMonthDebtAmount || 0),
    selectedMonthDebtAmount: Number(row.selectedMonthDebtAmount || 0),
    debtMonths: Number(row.debtMonths || 0),
  }));

  const topDebtorClassrooms = (topDebtorClassroomsRaw || []).map((row) => ({
    classroomId: row.classroomId || null,
    classroom: row.classroom || "-",
    debtorCount: Number(row.debtorCount || 0),
    totalDebtAmount: Number(row.totalDebtAmount || 0),
    thisMonthDebtAmount: Number(row.thisMonthDebtAmount || 0),
    previousMonthDebtAmount: Number(row.previousMonthDebtAmount || 0),
    selectedMonthDebtAmount: Number(row.selectedMonthDebtAmount || 0),
  }));

  const cashflow = await calculateFinanceCashflow({
    cohortStudentIds,
    settings,
    cashflowMonthKey,
    currentMonthKey,
    selectedMonthKey,
    thisMonthDebtAmount,
    selectedMonthDebtAmount,
  });

  const monthStart = startOfMonthUtc(now);
  const monthEnd = nextMonthStart(now);
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const yearEnd = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
  const paidAmounts = await fetchFilteredPaidAmounts({
    search,
    classroomId,
    classroomIds,
    status,
    debtMonth,
    targetYear: selectedYear,
    targetMonth: selectedMonth,
    currentYear,
    currentMonth,
    previousYear,
    previousMonth,
    monthStart,
    monthEnd,
    yearStart,
    yearEnd,
  });

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
    thisMonthPaidAmount: Number(paidAmounts.thisMonthPaidAmount || 0),
    thisYearPaidAmount: Number(paidAmounts.thisYearPaidAmount || 0),
    monthlyPlanAmount,
    yearlyPlanAmount: monthlyPlanAmount * readTarifTolovOylarSoni(settings),
    tarifOylikSumma: Number(settings.oylikSumma || 0),
    tarifYillikSumma: Number(settings.yillikSumma || 0),
    tarifTolovOylarSoni: readTarifTolovOylarSoni(settings),
    cashflow,
    selectedMonth: selectedMonthKey,
    topDebtors,
    topDebtorClassrooms,
  };
}

module.exports = {
  executeFetchFinanceSummary,
};
