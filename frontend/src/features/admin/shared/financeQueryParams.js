export function isAllClassroomsFinanceView(classroomId) {
  return !classroomId || classroomId === 'all';
}

export function toFinanceClassroomParam(classroomId) {
  return isAllClassroomsFinanceView(classroomId) ? undefined : classroomId;
}

export function buildFinanceStudentsParams(financeQuery, search) {
  return {
    page: financeQuery.page,
    limit: financeQuery.limit,
    status: financeQuery.status,
    debtMonth: financeQuery.debtMonth,
    debtTargetMonth: financeQuery.debtTargetMonth || undefined,
    cashflowMonth: financeQuery.cashflowMonth || undefined,
    search,
    classroomId: toFinanceClassroomParam(financeQuery.classroomId),
  };
}

export function buildFinanceSummaryParams(financeQuery, search) {
  return buildFinanceStudentsParams(financeQuery, search);
}

