import FinancePaymentsListView from './FinancePaymentsList';
import { MiniStatCard, MonthChips } from './financeUiShared';
import { statusBadge } from './financeUiUtils.jsx';
import {
  formatMonthKey,
  sumFormat,
} from './financeSectionModel';

export default function FinancePaymentsWorkspace({
  t,
  locale,
  query,
  onChangeQuery,
  classrooms,
  studentsState,
  students,
  statusPanel,
  cashflowPanel,
  exporting,
  onExportDebtors,
  onOpenPayroll,
  openPaymentModal,
}) {
  return (
    <FinancePaymentsListView
      t={t}
      query={query}
      onChangeQuery={onChangeQuery}
      classrooms={classrooms}
      studentsState={studentsState}
      students={students}
      statusPanel={statusPanel}
      cashflowPanel={cashflowPanel}
      locale={locale}
      sumFormat={sumFormat}
      exporting={exporting}
      onExportDebtors={onExportDebtors}
      onOpenPayroll={onOpenPayroll}
      openPaymentModal={openPaymentModal}
      MiniStatCard={MiniStatCard}
      MonthChips={MonthChips}
      statusBadge={statusBadge}
      formatMonthKey={formatMonthKey}
    />
  );
}
