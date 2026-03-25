import { Card, StateView } from '../../../../../components/ui';
import FinanceCashflowPanel from './FinanceCashflowPanel';
import FinancePaymentsDesktopTable from './FinancePaymentsDesktopTable';
import FinancePaymentsFilters from './FinancePaymentsFilters';
import FinancePaymentsMobileList from './FinancePaymentsMobileList';
import FinancePaymentsPagination from './FinancePaymentsPagination';
import FinancePaymentsStatusPanel from './FinancePaymentsStatusPanel';

export default function FinancePaymentsList({
  t,
  query,
  onChangeQuery,
  classrooms,
  studentsState,
  students,
  statusPanel,
  cashflowPanel,
  locale,
  sumFormat,
  exporting,
  onExportDebtors,
  onOpenPayroll,
  openPaymentModal,
  MiniStatCard,
  MonthChips,
  statusBadge,
  formatMonthKey,
}) {
  return (
    <Card title={t("To'lovlar ro'yxati")}>
      <FinanceCashflowPanel
        t={t}
        query={query}
        onChangeQuery={onChangeQuery}
        cashflowPanel={cashflowPanel}
        locale={locale}
        sumFormat={sumFormat}
        MiniStatCard={MiniStatCard}
        onOpenPayroll={onOpenPayroll}
      />

      <FinancePaymentsStatusPanel t={t} statusPanel={statusPanel} MiniStatCard={MiniStatCard} />
      <FinancePaymentsFilters
        t={t}
        query={query}
        onChangeQuery={onChangeQuery}
        classrooms={classrooms}
        exporting={exporting}
        onExportDebtors={onExportDebtors}
      />

      {studentsState.loading && <StateView type="loading" />}
      {studentsState.error && <StateView type="error" description={studentsState.error} />}
      {!studentsState.loading && !studentsState.error && (
        <>
          <FinancePaymentsMobileList
            t={t}
            students={students}
            locale={locale}
            sumFormat={sumFormat}
            openPaymentModal={openPaymentModal}
            MonthChips={MonthChips}
            statusBadge={statusBadge}
            formatMonthKey={formatMonthKey}
          />

          <FinancePaymentsDesktopTable
            t={t}
            students={students}
            locale={locale}
            sumFormat={sumFormat}
            openPaymentModal={openPaymentModal}
            MonthChips={MonthChips}
            statusBadge={statusBadge}
            formatMonthKey={formatMonthKey}
          />
        </>
      )}

      {!studentsState.loading && !studentsState.error && (
        <FinancePaymentsPagination
          t={t}
          query={query}
          studentsState={studentsState}
          onChangeQuery={onChangeQuery}
        />
      )}
    </Card>
  );
}
