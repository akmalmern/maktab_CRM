import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, StateView } from '../../../../components/ui';
import { usePreviewFinancePaymentMutation } from '../../../../services/api/financeApi';
import FinanceSettingsPanelView from './finance/FinanceSettingsPanel';
import FinancePaymentsListView from './finance/FinancePaymentsList';
import FinancePaymentModalView from './finance/FinancePaymentModal';
import PayrollAdvancesManager from './finance/PayrollAdvancesManager';
import {
  buildFinancePaymentPreview,
  mergeServerPaymentPreview,
} from './finance/paymentPreviewModel';
import { FieldLabel, MiniStatCard, MonthChips } from './finance/financeUiShared';
import { statusBadge } from './finance/financeUiUtils.jsx';
import {
  BILLING_MONTH_OPTIONS,
  SCHOOL_MONTH_ORDER,
  resolveLocale,
  sumFormat,
  createClientRequestKey,
  monthNameByNumber,
  formatMonthKey,
  normalizeBillingMonths,
  sortSchoolMonths,
  normalizeChargeableMonths,
  buildAcademicYearOptions,
  createDefaultPaymentForm,
  createDefaultImtiyozForm,
  createDefaultSettingsDraft,
  buildPaymentPayloadFromForm,
  buildFinanceSettingsValidation,
  buildFinanceStatusPanel,
  buildFinanceCashflowPanel,
  getCurrentAcademicYearLabel,
  isValidAcademicYearLabel,
} from './finance/financeSectionModel';

function useFinancePaymentPreview({ detailStudent, isSelectedDetailReady, paymentForm, oylikTarif }) {
  return useMemo(() => {
    if (!detailStudent || !isSelectedDetailReady) return null;
    return buildFinancePaymentPreview({ detailStudent, paymentForm, oylikTarif });
  }, [detailStudent, isSelectedDetailReady, paymentForm, oylikTarif]);
}

export default function FinanceSection({
  classrooms,
  settings,
  settingsMeta,
  studentsState,
  studentsSummary,
  detailState,
  query,
  actionLoading,
  onChangeQuery,
  onRefresh,
  onSaveSettings,
  onOpenDetail,
  onCreatePayment,
  onCreateImtiyoz,
  onDeactivateImtiyoz,
  onRollbackTarif,
  onRevertPayment,
  onExportDebtors,
  onOpenPayroll,
  exporting,
}) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const [activeTab, setActiveTab] = useState('payments');
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentModalTab, setPaymentModalTab] = useState('payment');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentRequestKey, setPaymentRequestKey] = useState('');
  const [serverPaymentPreview, setServerPaymentPreview] = useState(null);
  const [previewFinancePayment, previewFinancePaymentState] = usePreviewFinancePaymentMutation();
  const [settingsDraft, setSettingsDraft] = useState(createDefaultSettingsDraft);
  const [paymentForm, setPaymentForm] = useState(createDefaultPaymentForm);
  const [imtiyozForm, setImtiyozForm] = useState(createDefaultImtiyozForm);

  const students = useMemo(() => studentsState.items || [], [studentsState.items]);
  const detailStudent = detailState.student;
  const detailImtiyozlar = useMemo(() => detailState.imtiyozlar || [], [detailState.imtiyozlar]);
  const isSelectedDetailReady =
    Boolean(selectedStudentId) &&
    Boolean(detailStudent) &&
    String(detailStudent?.id) === String(selectedStudentId);

  const settingsValidation = useMemo(
    () =>
      buildFinanceSettingsValidation({
        settingsDraft,
        settings,
        settingsMeta,
        t,
        locale,
      }),
    [settingsDraft, settings, settingsMeta, t, locale],
  );

  const statusPanel = useMemo(
    () =>
      buildFinanceStatusPanel({
        studentsSummary,
        studentsState,
        settings,
        t,
        locale,
      }),
    [studentsSummary, studentsState, settings, t, locale],
  );

  const billingAcademicYearOptions = useMemo(
    () => buildAcademicYearOptions(classrooms, settingsValidation.computed.billingAcademicYear),
    [classrooms, settingsValidation.computed.billingAcademicYear],
  );

  const cashflowPanel = useMemo(
    () => buildFinanceCashflowPanel({ studentsSummary, locale }),
    [studentsSummary, locale],
  );

  const localPaymentPreview = useFinancePaymentPreview({
    detailStudent,
    isSelectedDetailReady,
    paymentForm,
    oylikTarif: studentsSummary?.tarifOylikSumma || settings?.oylikSumma || 0,
  });
  const activeServerPaymentPreview =
    modalOpen && paymentModalTab === 'payment' && selectedStudentId && isSelectedDetailReady
      ? serverPaymentPreview
      : null;
  const paymentPreview = useMemo(
    () => mergeServerPaymentPreview(localPaymentPreview, activeServerPaymentPreview),
    [localPaymentPreview, activeServerPaymentPreview],
  );

  useEffect(() => {
    if (!modalOpen || paymentModalTab !== 'payment' || !selectedStudentId) return;
    if (!isSelectedDetailReady || !paymentForm.startMonth) return;

    const payload = buildPaymentPayloadFromForm(paymentForm, paymentRequestKey);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await previewFinancePayment({ studentId: selectedStudentId, payload }).unwrap();
        if (!cancelled) setServerPaymentPreview(result?.preview || null);
      } catch {
        if (!cancelled) setServerPaymentPreview(null);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    modalOpen,
    paymentModalTab,
    selectedStudentId,
    isSelectedDetailReady,
    paymentForm,
    paymentRequestKey,
    previewFinancePayment,
  ]);

  function openPaymentModal(studentId) {
    setSelectedStudentId(studentId);
    setPaymentModalTab('payment');
    setPaymentRequestKey(createClientRequestKey());
    setServerPaymentPreview(null);
    setPaymentForm(createDefaultPaymentForm());
    setImtiyozForm(createDefaultImtiyozForm());
    setModalOpen(true);
    onOpenDetail(studentId);
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    if (!settingsValidation.valid) return;

    const oylik =
      settingsDraft.oylikSumma === '' ? Number(settings.oylikSumma || 0) : Number(settingsDraft.oylikSumma);
    const tolovOylarSoni = settingsValidation.computed.tolovOylarSoni;
    const yillik = settingsValidation.computed.yillik;

    const ok = await onSaveSettings({
      oylikSumma: oylik,
      yillikSumma: yillik,
      tolovOylarSoni,
      billingCalendar: {
        academicYear: settingsValidation.computed.billingAcademicYear,
        chargeableMonths: settingsValidation.computed.billingChargeableMonths,
      },
      boshlanishTuri: 'KELASI_OY',
      izoh: settingsDraft.izoh || undefined,
    });
    if (ok) {
      setSettingsDraft(createDefaultSettingsDraft());
      onRefresh();
    }
  }

  function handleResetDraft() {
    setSettingsDraft(createDefaultSettingsDraft());
  }

  function handleDefaultDraft() {
    const currentAcademicYear = isValidAcademicYearLabel(settings?.billingCalendar?.academicYear)
      ? settings.billingCalendar.academicYear
      : getCurrentAcademicYearLabel();
    setSettingsDraft({
      oylikSumma: '300000',
      billingAcademicYear: currentAcademicYear,
      billingChargeableMonths: SCHOOL_MONTH_ORDER.slice(0, 10),
      izoh: '',
    });
  }

  function toggleBillingMonth(month) {
    setSettingsDraft((prev) => {
      const currentBillingMonths = normalizeBillingMonths(settings?.tolovOylarSoni, 10);
      const currentMonths = Array.isArray(prev.billingChargeableMonths)
        ? prev.billingChargeableMonths
        : normalizeChargeableMonths(settings?.billingCalendar?.chargeableMonths, currentBillingMonths);
      const nextMonths = currentMonths.includes(month)
        ? currentMonths.filter((m) => m !== month)
        : [...currentMonths, month];
      return {
        ...prev,
        billingChargeableMonths: sortSchoolMonths(nextMonths),
      };
    });
  }

  async function handleCreatePayment(e) {
    e.preventDefault();
    const payload = buildPaymentPayloadFromForm(paymentForm, paymentRequestKey);

    const ok = await onCreatePayment(selectedStudentId, payload);
    if (ok) {
      setPaymentRequestKey(createClientRequestKey());
      await onOpenDetail(selectedStudentId);
      onRefresh();
    }
  }

  async function handleCreateImtiyoz(e) {
    e.preventDefault();
    const payload = {
      turi: imtiyozForm.turi,
      boshlanishOy: imtiyozForm.boshlanishOy,
      oylarSoni: Number(imtiyozForm.oylarSoni || 1),
      sabab: imtiyozForm.sabab,
      izoh: imtiyozForm.izoh || undefined,
    };
    if (imtiyozForm.turi !== 'TOLIQ_OZOD') {
      payload.qiymat = Number(imtiyozForm.qiymat || 0);
    }

    const ok = await onCreateImtiyoz(selectedStudentId, payload);
    if (ok) {
      await onOpenDetail(selectedStudentId);
      onRefresh();
    }
  }

  async function handleDeactivateImtiyoz(imtiyozId) {
    const ok = await onDeactivateImtiyoz(imtiyozId, { sabab: t('Admin tomonidan bekor qilindi') });
    if (ok) {
      await onOpenDetail(selectedStudentId);
      onRefresh();
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title={t("Moliya bo'limi")}
        actions={
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-1">
            <Button
              size="sm"
              variant={activeTab === 'payments' ? 'indigo' : 'secondary'}
              onClick={() => setActiveTab('payments')}
            >
              {t("To'lovlar")}
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'settings' ? 'indigo' : 'secondary'}
              onClick={() => setActiveTab('settings')}
            >
              {t("Tarif sozlamalari")}
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'advances' ? 'indigo' : 'secondary'}
              onClick={() => setActiveTab('advances')}
            >
              {t("Avanslar")}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">{t("Bo'limni tanlang: To'lovlar, Tarif sozlamalari yoki Avanslar.")}</p>
      </Card>

      {activeTab === 'settings' && (
        <FinanceSettingsPanelView
          t={t}
          settings={settings}
          settingsMeta={settingsMeta}
          settingsDraft={settingsDraft}
          setSettingsDraft={setSettingsDraft}
          settingsValidation={settingsValidation}
          actionLoading={actionLoading}
          handleSaveSettings={handleSaveSettings}
          handleResetDraft={handleResetDraft}
          handleDefaultDraft={handleDefaultDraft}
          toggleBillingMonth={toggleBillingMonth}
          billingAcademicYearOptions={billingAcademicYearOptions}
          locale={locale}
          sumFormat={sumFormat}
          normalizeBillingMonths={normalizeBillingMonths}
          isValidAcademicYearLabel={isValidAcademicYearLabel}
          monthNameByNumber={monthNameByNumber}
          SCHOOL_MONTH_ORDER={SCHOOL_MONTH_ORDER}
          BILLING_MONTH_OPTIONS={BILLING_MONTH_OPTIONS}
          FieldLabel={FieldLabel}
          MiniStatCard={MiniStatCard}
        />
      )}

      {activeTab === 'payments' && (
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
      )}

      {activeTab === 'advances' && (
        <PayrollAdvancesManager />
      )}

      <FinancePaymentModalView
        t={t}
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        selectedStudentId={selectedStudentId}
        detailState={detailState}
        detailStudent={detailStudent}
        detailImtiyozlar={detailImtiyozlar}
        paymentModalTab={paymentModalTab}
        setPaymentModalTab={setPaymentModalTab}
        actionLoading={actionLoading}
        settingsMeta={settingsMeta}
        onRollbackTarif={onRollbackTarif}
        onRevertPayment={onRevertPayment}
        isSelectedDetailReady={isSelectedDetailReady}
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        handleCreatePayment={handleCreatePayment}
        paymentPreview={paymentPreview}
        serverPreviewLoading={previewFinancePaymentState.isLoading}
        serverPreviewError={previewFinancePaymentState.error?.message || null}
        imtiyozForm={imtiyozForm}
        setImtiyozForm={setImtiyozForm}
        handleCreateImtiyoz={handleCreateImtiyoz}
        handleDeactivateImtiyoz={handleDeactivateImtiyoz}
        MonthChips={MonthChips}
        formatMonthKey={(value) => formatMonthKey(value, locale)}
        sumFormat={(value) => sumFormat(value, locale)}
        locale={locale}
      />
    </div>
  );
}

