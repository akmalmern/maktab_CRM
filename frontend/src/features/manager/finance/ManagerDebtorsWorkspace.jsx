import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
} from '../../../components/ui';
import {
  formatMoney,
  formatMonthKey,
  imtiyozTypeLabel,
  paymentTypeLabel,
} from './managerDebtorsModel';
import { ManagerDebtorsFilters } from './components/ManagerDebtorsFilters';
import { ManagerDebtorNotesModal } from './components/ManagerDebtorNotesModal';
import { ManagerPaymentModal } from './components/ManagerPaymentModal';
import { ManagerDebtorsSummary } from './components/ManagerDebtorsSummary';
import { ManagerDebtorsTable } from './components/ManagerDebtorsTable';
import useManagerDebtorsPage from './useManagerDebtorsPage';

export function ManagerDebtorsWorkspace() {
  const { t } = useTranslation();
  const {
    classrooms,
    query,
    setQuery,
    resetQuery,
    studentsState,
    globalSummaryState,
    summaryCards,
    locale,
    modalOpen,
    selectedStudent,
    noteForm,
    setNoteForm,
    notesState,
    savingNote,
    paymentModalOpen,
    paymentModalTab,
    setPaymentModalTab,
    paymentStudent,
    paymentForm,
    setPaymentForm,
    imtiyozForm,
    setImtiyozForm,
    paymentState,
    mergedPaymentPreview,
    serverPreviewState,
    paymentActionLoading,
    reloadDebtors,
    openModal,
    closeModal,
    loadNotes,
    handleSaveNote,
    openPaymentHistory,
    closePaymentModal,
    handleSubmitPayment,
    handleCreateImtiyoz,
    handleDeactivateImtiyoz,
    handleRevertPayment,
    fillAllDebtIntoPaymentForm,
    firstDebtMonth,
  } = useManagerDebtorsPage();

  return (
    <div className="space-y-4">
      <ManagerDebtorsSummary
        t={t}
        summaryCards={summaryCards}
        globalSummaryState={globalSummaryState}
      />

      <Card>
        <ManagerDebtorsFilters
          t={t}
          classrooms={classrooms}
          query={query}
          setQuery={setQuery}
          resetQuery={resetQuery}
          reloadDebtors={reloadDebtors}
        />

        <div className="mt-3">
          <ManagerDebtorsTable
            t={t}
            locale={locale}
            studentsState={studentsState}
            formatMoney={formatMoney}
            formatMonthKey={formatMonthKey}
            openPaymentHistory={openPaymentHistory}
            openModal={openModal}
          />
        </div>
      </Card>

      <ManagerDebtorNotesModal
        open={modalOpen}
        onClose={closeModal}
        selectedStudent={selectedStudent}
        noteForm={noteForm}
        setNoteForm={setNoteForm}
        savingNote={savingNote}
        notesState={notesState}
        onSaveNote={handleSaveNote}
        onLoadNotes={loadNotes}
      />

      <ManagerPaymentModal
        open={paymentModalOpen}
        onClose={closePaymentModal}
        paymentStudent={paymentStudent}
        paymentModalTab={paymentModalTab}
        setPaymentModalTab={setPaymentModalTab}
        paymentState={paymentState}
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        imtiyozForm={imtiyozForm}
        setImtiyozForm={setImtiyozForm}
        paymentActionLoading={paymentActionLoading}
        mergedPaymentPreview={mergedPaymentPreview}
        serverPreviewState={serverPreviewState}
        onSubmitPayment={handleSubmitPayment}
        onCreateImtiyoz={handleCreateImtiyoz}
        onDeactivateImtiyoz={handleDeactivateImtiyoz}
        onRevertPayment={handleRevertPayment}
        onFillAllDebt={fillAllDebtIntoPaymentForm}
        paymentTypeLabel={(type) => paymentTypeLabel(type, t)}
        imtiyozTypeLabel={(type) => imtiyozTypeLabel(type, t)}
        firstDebtMonth={firstDebtMonth}
      />
    </div>
  );
}
