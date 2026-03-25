import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../../app/hooks';
import AutoTranslate from '../../../../components/AutoTranslate';
import {
  Card,
  ConfirmModal,
  Tabs,
} from '../../../../components/ui';
import useAsyncConfirm from '../../../../hooks/useAsyncConfirm';
import { useLazyGetTeachersQuery } from '../../../../services/api/peopleApi';
import { useGetSubjectsQuery } from '../../../../services/api/subjectsApi';
import {
  useGetPayrollAutomationHealthQuery,
  useGetPayrollEmployeesQuery,
  useGetPayrollMonthlyReportQuery,
  useGetPayrollRunDetailQuery,
  useGetPayrollRunsQuery,
  useLazyGetPayrollSubjectRatesQuery,
  useLazyGetPayrollTeacherRatesQuery,
} from '../../../../services/api/payrollApi';
import {
  PayrollConfigPanel,
  PayrollRatesPanel,
  PayrollSettingsHeader,
} from './payroll/SettingsPanels';
import {
  PayrollAdjustmentDrawer,
  PayrollEmployeeConfigModal,
  PayrollPayItemModal,
  PayrollRateCreateDrawer,
  PayrollRateEditModal,
} from './payroll/PayrollDialogs';
import { PayrollRunsPanel } from './payroll/RunsPanel';
import { resolveRunPrimaryAction } from './payroll/runActions';
import {
  createPayrollEmployeeColumns,
  createRunItemsColumns,
  createSubjectRatesColumns,
  createTeacherRatesColumns,
} from './payroll/payrollColumnFactories';
import {
  DEFAULT_EMPLOYEE_CONFIG_FILTERS,
  DEFAULT_LINE_FILTERS,
  DEFAULT_RUN_FILTERS,
  buildOwnerKey,
  formatMoneyRaw,
  formatOwnerName,
  getCurrentMonthKey,
  getPayrollStatusLabel,
  parseOwnerKey,
  resolveLocale,
  toDateInput,
} from './payroll/payrollSectionModel';
import { usePayrollRunItems } from './payroll/usePayrollRunItems';
import { usePayrollRatesDatasets } from './payroll/usePayrollRatesDatasets';
import useScheduleTeachersDirectory from '../useScheduleTeachersDirectory';
import usePayrollSectionController from './payroll/usePayrollSectionController';


export default function PayrollSection() {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const formatMoney = useCallback((value) => formatMoneyRaw(value, locale), [locale]);
  const { askConfirm, confirmModalProps } = useAsyncConfirm();
  const role = useAppSelector((state) => state.auth.role);
  const isManagerView = role === 'MANAGER';
  const isAdminView = role === 'ADMIN';

  const [tab, setTab] = useState('runs');
  const [settingsTab, setSettingsTab] = useState('config');
  const [periodMonth, setPeriodMonth] = useState(getCurrentMonthKey());
  const [selectedRunId, setSelectedRunId] = useState('');
  const [runFilters, setRunFilters] = useState({ ...DEFAULT_RUN_FILTERS, periodMonth: getCurrentMonthKey() });
  const [lineFilters, setLineFilters] = useState(DEFAULT_LINE_FILTERS);

  const [teacherRateForm, setTeacherRateForm] = useState({
    teacherId: '',
    subjectId: '',
    ratePerHour: '',
    effectiveFrom: '',
    effectiveTo: '',
    note: '',
  });
  const [subjectRateForm, setSubjectRateForm] = useState({
    subjectId: '',
    ratePerHour: '',
    effectiveFrom: '',
    effectiveTo: '',
    note: '',
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    ownerKey: '',
    type: 'BONUS',
    amount: '',
    description: '',
  });
  const [payForm, setPayForm] = useState({
    paymentMethod: 'BANK',
    paidAt: '',
    externalRef: '',
    note: '',
  });
  const [automationForm, setAutomationForm] = useState({
    mode: 'GENERATE_APPROVE',
    paymentMethod: 'BANK',
    force: false,
  });
  const [payItemModal, setPayItemModal] = useState({
    open: false,
    itemId: '',
    ownerLabel: '',
    payableAmount: 0,
    paidAmount: 0,
  });
  const [payItemForm, setPayItemForm] = useState({
    amount: '',
    paymentMethod: 'BANK',
    paidAt: '',
    externalRef: '',
    note: '',
  });
  const [employeeConfigFilters, setEmployeeConfigFilters] = useState(DEFAULT_EMPLOYEE_CONFIG_FILTERS);
  const [employeeConfigModal, setEmployeeConfigModal] = useState({
    open: false,
    employeeId: '',
    displayName: '',
    payrollMode: 'LESSON_BASED',
    fixedSalaryAmount: '',
    isPayrollEligible: true,
    employmentStatus: 'ACTIVE',
    note: '',
  });
  const [reverseReason, setReverseReason] = useState('');
  const [rateEditModal, setRateEditModal] = useState({
    open: false,
    kind: 'teacher',
    rateId: '',
    teacherId: '',
    subjectId: '',
    ratePerHour: '',
    effectiveFrom: '',
    effectiveTo: '',
    note: '',
  });
  const [rateCreateDrawer, setRateCreateDrawer] = useState({ open: false, kind: 'teacher' });
  const [adjustmentDrawerOpen, setAdjustmentDrawerOpen] = useState(false);
  const [loadPayrollTeacherRates] = useLazyGetPayrollTeacherRatesQuery();
  const [loadPayrollSubjectRates] = useLazyGetPayrollSubjectRatesQuery();
  const [loadTeachersPage] = useLazyGetTeachersQuery();
  const teacherDirectory = useScheduleTeachersDirectory({
    enabled: !isManagerView,
    fetchTeachersPage: loadTeachersPage,
    baseQuery: {
      filter: 'all',
      sort: 'name:asc',
      status: 'active',
    },
  });
  const subjectsQuery = useGetSubjectsQuery(undefined, { skip: isManagerView });
  const teachers = useMemo(() => teacherDirectory.items || [], [teacherDirectory.items]);
  const subjects = useMemo(() => subjectsQuery.data?.subjects || [], [subjectsQuery.data?.subjects]);

  const payrollRunsQuery = useGetPayrollRunsQuery({
    page: runFilters.page,
    limit: runFilters.limit,
    ...(runFilters.status ? { status: runFilters.status } : {}),
    ...(runFilters.periodMonth ? { periodMonth: runFilters.periodMonth } : {}),
  });
  const payrollAutomationHealthQuery = useGetPayrollAutomationHealthQuery(
    {
      periodMonth,
      includeDetails: false,
    },
    { skip: tab !== 'runs' || !periodMonth },
  );
  const payrollMonthlyReportQuery = useGetPayrollMonthlyReportQuery(
    {
      periodMonth,
      includeDetails: false,
    },
    { skip: tab !== 'runs' || !periodMonth },
  );
  const runs = useMemo(() => payrollRunsQuery.data?.runs || [], [payrollRunsQuery.data?.runs]);
  const activeRunId =
    (selectedRunId && runs.some((run) => run.id === selectedRunId) ? selectedRunId : '') ||
    runs[0]?.id ||
    '';
  const lineOwnerFilter = parseOwnerKey(lineFilters.ownerKey);

  const payrollRunDetailQuery = useGetPayrollRunDetailQuery(
    {
      runId: activeRunId,
      params: {
        page: lineFilters.page,
        limit: lineFilters.limit,
        ...(lineOwnerFilter.teacherId ? { teacherId: lineOwnerFilter.teacherId } : {}),
        ...(lineOwnerFilter.employeeId ? { employeeId: lineOwnerFilter.employeeId } : {}),
        ...(lineFilters.type ? { type: lineFilters.type } : {}),
      },
    },
    { skip: !activeRunId },
  );

  const payrollEmployeesQuery = useGetPayrollEmployeesQuery(
    {
      page: employeeConfigFilters.page,
      limit: employeeConfigFilters.limit,
      ...(employeeConfigFilters.kind ? { kind: employeeConfigFilters.kind } : {}),
      ...(employeeConfigFilters.payrollMode ? { payrollMode: employeeConfigFilters.payrollMode } : {}),
      ...(employeeConfigFilters.employmentStatus
        ? { employmentStatus: employeeConfigFilters.employmentStatus }
        : {}),
      ...(employeeConfigFilters.isPayrollEligible === ''
        ? {}
        : { isPayrollEligible: employeeConfigFilters.isPayrollEligible === 'true' }),
      ...(employeeConfigFilters.search ? { search: employeeConfigFilters.search } : {}),
    },
    { skip: isManagerView || tab !== 'settings' || settingsTab !== 'config' },
  );

  const selectedRun = payrollRunDetailQuery.data?.run || null;
  const {
    busy,
    ratesReloadKey,
    handleGenerateRun,
    handleCreateTeacherRate,
    handleDeleteTeacherRate,
    handleCreateSubjectRate,
    handleDeleteSubjectRate,
    openRateCreateDrawer,
    closeRateCreateDrawer,
    openTeacherRateEditModal,
    openSubjectRateEditModal,
    closeRateEditModal,
    handleSubmitRateEdit,
    handleAddAdjustment,
    handleApproveRun,
    handlePayRun,
    openPayItemModal,
    closePayItemModal,
    handlePayItem,
    openEmployeeConfigModal,
    closeEmployeeConfigModal,
    handleSaveEmployeeConfig,
    handleReverseRun,
    handleExportRunExcel,
    handleRunAutomation,
    handleRefreshRunsDashboard,
    handleSelectRunId,
  } = usePayrollSectionController({
    t,
    askConfirm,
    periodMonth,
    setRunFilters,
    setSelectedRunId,
    payrollRunsQuery,
    payrollAutomationHealthQuery,
    payrollMonthlyReportQuery,
    payrollRunDetailQuery,
    activeRunId,
    selectedRun,
    lineOwnerFilter,
    lineFilters,
    setLineFilters,
    teacherRateForm,
    setTeacherRateForm,
    subjectRateForm,
    setSubjectRateForm,
    setRateCreateDrawer,
    rateEditModal,
    setRateEditModal,
    adjustmentForm,
    setAdjustmentForm,
    setAdjustmentDrawerOpen,
    payForm,
    payItemModal,
    setPayItemModal,
    payItemForm,
    setPayItemForm,
    employeeConfigModal,
    setEmployeeConfigModal,
    reverseReason,
    setReverseReason,
    automationForm,
  });

  const shouldLoadRatesPanel = !isManagerView && tab === 'settings' && settingsTab === 'rates';
  const {
    payrollTeacherRatesQuery,
    payrollSubjectRatesQuery,
    loadMoreTeacherRates,
    loadMoreSubjectRates,
  } = usePayrollRatesDatasets({
    shouldLoad: shouldLoadRatesPanel,
    reloadKey: ratesReloadKey,
    loadPayrollTeacherRates,
    loadPayrollSubjectRates,
  });

  const { selectedRunTeacherRows, pagedRunItems } = usePayrollRunItems({
    selectedRun,
    teachers,
    lineFilters,
  });
  const selectedRunPaidAmount = useMemo(
    () => (selectedRun?.items || []).reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
    [selectedRun?.items],
  );
  const selectedRunPayableAmount = Math.max(0, Number(selectedRun?.payableAmount || 0));
  const selectedRunRemainingAmount = Math.max(0, selectedRunPayableAmount - selectedRunPaidAmount);
  const canEditSelectedRun = isAdminView && selectedRun?.status === 'DRAFT';
  const canApproveSelectedRun = (isAdminView || isManagerView) && selectedRun?.status === 'DRAFT';
  const canPaySelectedRun = isAdminView && selectedRun?.status === 'APPROVED';
  const canReverseSelectedRun = isAdminView && (selectedRun?.status === 'APPROVED' || selectedRun?.status === 'PAID');

  const teacherOptionLabel = useCallback(
    (teacher) => `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.user?.username || teacher.id,
    [],
  );

  const teacherComboboxOptions = useMemo(
    () =>
      teachers.map((teacher) => ({
        value: teacher.id,
        label: teacherOptionLabel(teacher),
        searchText: `${teacher.firstName || ''} ${teacher.lastName || ''} ${teacher.user?.username || ''}`,
      })),
    [teacherOptionLabel, teachers],
  );
  const teacherOwnerOptions = useMemo(
    () =>
      teacherComboboxOptions.map((row) => ({
        value: buildOwnerKey({ teacherId: row.value }),
        label: `${row.label} (${t("O'qituvchi")})`,
        searchText: `${row.searchText || ''} ${t("O'qituvchi")}`,
      })),
    [teacherComboboxOptions, t],
  );
  const selectedRunOwnerOptions = useMemo(() => {
    const rowsByKey = new Map();
    for (const item of selectedRun?.items || []) {
      const ownerKey = buildOwnerKey({ teacherId: item.teacherId, employeeId: item.employeeId });
      if (!ownerKey || rowsByKey.has(ownerKey)) continue;
      const snapshotName = `${item.teacherFirstNameSnapshot || ''} ${item.teacherLastNameSnapshot || ''}`.trim();
      const ownerId = item.teacherId || item.employeeId || '';
      const label = formatOwnerName({
        teacher: item.teacher,
        employee: item.employee,
        fallbackName: snapshotName,
        fallbackId: ownerId,
      });
      const ownerType = item.teacherId ? t("O'qituvchi") : t('Xodim');
      rowsByKey.set(ownerKey, {
        value: ownerKey,
        label: `${label} (${ownerType})`,
        searchText: `${label} ${ownerType} ${ownerId} ${item.teacherUsernameSnapshot || ''}`,
      });
    }
    for (const option of teacherOwnerOptions) {
      if (!rowsByKey.has(option.value)) {
        rowsByKey.set(option.value, option);
      }
    }
    return [...rowsByKey.values()];
  }, [selectedRun, teacherOwnerOptions, t]);
  const runItemsColumns = useMemo(
    () => createRunItemsColumns({
      t,
      formatMoney,
      isAdminView,
      selectedRunStatus: selectedRun?.status,
      busy,
      openPayItemModal,
    }),
    [busy, formatMoney, isAdminView, openPayItemModal, selectedRun?.status, t],
  );

  const runPrimaryAction = resolveRunPrimaryAction({
    selectedRun,
    isAdminView,
    isManagerView,
    canApproveSelectedRun,
    canPaySelectedRun,
    busy,
    labels: {
      approve: t('Tasdiqlash'),
      payAll: t("Barchasini to'lash"),
      downloadExcel: `${t('Yuklab olish')} (Excel)`,
    },
    handlers: {
      onApprove: handleApproveRun,
      onPay: handlePayRun,
      onExportExcel: handleExportRunExcel,
    },
  });

  const teacherRatesColumns = useMemo(
    () => createTeacherRatesColumns({
      t,
      formatMoney,
      isAdminView,
      openTeacherRateEditModal,
      handleDeleteTeacherRate,
      toDateInput,
    }),
    [formatMoney, handleDeleteTeacherRate, isAdminView, openTeacherRateEditModal, t],
  );

  const subjectRatesColumns = useMemo(
    () => createSubjectRatesColumns({
      t,
      formatMoney,
      isAdminView,
      openSubjectRateEditModal,
      handleDeleteSubjectRate,
      toDateInput,
    }),
    [formatMoney, handleDeleteSubjectRate, isAdminView, openSubjectRateEditModal, t],
  );

  const payrollEmployeeColumns = useMemo(
    () => createPayrollEmployeeColumns({
      t,
      formatMoney,
      isAdminView,
      busy,
      openEmployeeConfigModal,
    }),
    [busy, formatMoney, isAdminView, openEmployeeConfigModal, t],
  );

  const runsState = {
    loading: payrollRunsQuery.isLoading || payrollRunsQuery.isFetching,
    error: payrollRunsQuery.error?.message || null,
    page: payrollRunsQuery.data?.page || runFilters.page,
    pages: payrollRunsQuery.data?.pages || 1,
    total: payrollRunsQuery.data?.total || 0,
  };
  const runDetailLoading = payrollRunDetailQuery.isLoading || payrollRunDetailQuery.isFetching;
  const runDetailError = payrollRunDetailQuery.error?.message || null;
  const teacherRates = payrollTeacherRatesQuery.data?.rates || [];
  const subjectRates = payrollSubjectRatesQuery.data?.rates || [];
  const payrollEmployees = payrollEmployeesQuery.data?.employees || [];
  const payrollEmployeesState = {
    loading: payrollEmployeesQuery.isLoading || payrollEmployeesQuery.isFetching,
    error: payrollEmployeesQuery.error?.message || null,
    page: payrollEmployeesQuery.data?.page || employeeConfigFilters.page,
    pages: payrollEmployeesQuery.data?.pages || 1,
    total: payrollEmployeesQuery.data?.total || 0,
  };
  const automationHealth = payrollAutomationHealthQuery.data;
  const automationHealthState = {
    loading: payrollAutomationHealthQuery.isLoading || payrollAutomationHealthQuery.isFetching,
    error: payrollAutomationHealthQuery.error?.message || null,
  };
  const monthlyReport = payrollMonthlyReportQuery.data;
  const monthlyReportState = {
    loading: payrollMonthlyReportQuery.isLoading || payrollMonthlyReportQuery.isFetching,
    error: payrollMonthlyReportQuery.error?.message || null,
  };
  const monthlyReportSummary = monthlyReport?.summary || null;
  const selectedRunTeacherCount = selectedRunTeacherRows.length;

  const payrollTabs = isManagerView
    ? [{ value: 'runs', label: t("Oylik hisob-kitoblari") }]
    : [
        { value: 'runs', label: t('Oyliklar') },
        { value: 'settings', label: t('Kengaytirilgan') },
      ];
  const settingsTabs = [
    { value: 'config', label: t('Oylik sozlamalari') },
    { value: 'rates', label: t('Soat narxlari') },
  ];

  return (
    <AutoTranslate>
      <div className="space-y-4">
        <Card
          title={t("O'qituvchi oyligi")}
          subtitle={
            isManagerView
              ? t("Menejer uchun ko'rish va tasdiqlash rejimi. Yaratish, stavka, dars, to'lash va bekor qilish amallari yopiq.")
              : t("Minimal oqim: oy tanlash, hisob-kitobni ko'rish, tasdiqlash va to'lash.")
          }
        >
          <Tabs
            value={tab}
            onChange={setTab}
            items={payrollTabs}
          />
        </Card>

        <PayrollRunsPanel
          tab={tab}
          periodMonth={periodMonth}
          setPeriodMonth={setPeriodMonth}
          setRunFilters={setRunFilters}
          runs={runs}
          activeRunId={activeRunId}
          setSelectedRunId={handleSelectRunId}
          selectedRun={selectedRun}
          runsState={runsState}
          runDetailLoading={runDetailLoading}
          runDetailError={runDetailError}
          isAdminView={isAdminView}
          isManagerView={isManagerView}
          busy={busy}
          handleRefreshRunsDashboard={handleRefreshRunsDashboard}
          handleGenerateRun={handleGenerateRun}
          automationHealth={automationHealth}
          monthlyReportSummary={monthlyReportSummary}
          monthlyReport={monthlyReport}
          automationHealthState={automationHealthState}
          monthlyReportState={monthlyReportState}
          formatMoney={formatMoney}
          automationForm={automationForm}
          setAutomationForm={setAutomationForm}
          handleRunAutomation={handleRunAutomation}
          selectedRunPayableAmount={selectedRunPayableAmount}
          selectedRunPaidAmount={selectedRunPaidAmount}
          selectedRunRemainingAmount={selectedRunRemainingAmount}
          runItemsColumns={runItemsColumns}
          runItemsRows={pagedRunItems.rows}
          runItemsState={pagedRunItems}
          lineFilters={lineFilters}
          setLineFilters={setLineFilters}
          selectedRunTeacherCount={selectedRunTeacherCount}
          payForm={payForm}
          setPayForm={setPayForm}
          canPaySelectedRun={canPaySelectedRun}
          runPrimaryAction={runPrimaryAction}
          canReverseSelectedRun={canReverseSelectedRun}
          reverseReason={reverseReason}
          setReverseReason={setReverseReason}
          handleReverseRun={handleReverseRun}
        />

        <PayrollSettingsHeader
          tab={tab}
          isManagerView={isManagerView}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          settingsTabs={settingsTabs}
        />

        <PayrollConfigPanel
          tab={tab}
          settingsTab={settingsTab}
          isManagerView={isManagerView}
          employeeConfigFilters={employeeConfigFilters}
          setEmployeeConfigFilters={setEmployeeConfigFilters}
          payrollEmployeesQuery={payrollEmployeesQuery}
          payrollEmployeesState={payrollEmployeesState}
          payrollEmployeeColumns={payrollEmployeeColumns}
          payrollEmployees={payrollEmployees}
        />

        <PayrollRatesPanel
          tab={tab}
          settingsTab={settingsTab}
          isManagerView={isManagerView}
          busy={busy}
          openRateCreateDrawer={openRateCreateDrawer}
          payrollTeacherRatesQuery={payrollTeacherRatesQuery}
          loadMoreTeacherRates={loadMoreTeacherRates}
          teacherRatesColumns={teacherRatesColumns}
          teacherRates={teacherRates}
          payrollSubjectRatesQuery={payrollSubjectRatesQuery}
          loadMoreSubjectRates={loadMoreSubjectRates}
          subjectRatesColumns={subjectRatesColumns}
          subjectRates={subjectRates}
        />
        <PayrollRateCreateDrawer
          t={t}
          open={rateCreateDrawer.open}
          onClose={closeRateCreateDrawer}
          kind={rateCreateDrawer.kind}
          busy={busy}
          teacherRateForm={teacherRateForm}
          setTeacherRateForm={setTeacherRateForm}
          subjectRateForm={subjectRateForm}
          setSubjectRateForm={setSubjectRateForm}
          teacherComboboxOptions={teacherComboboxOptions}
          subjects={subjects}
          onCreateTeacherRate={handleCreateTeacherRate}
          onCreateSubjectRate={handleCreateSubjectRate}
        />

        <PayrollAdjustmentDrawer
          t={t}
          open={adjustmentDrawerOpen}
          onClose={() => setAdjustmentDrawerOpen(false)}
          selectedRun={selectedRun}
          adjustmentForm={adjustmentForm}
          setAdjustmentForm={setAdjustmentForm}
          canEditSelectedRun={canEditSelectedRun}
          busy={busy}
          selectedRunOwnerOptions={selectedRunOwnerOptions}
          onAddAdjustment={handleAddAdjustment}
          getPayrollStatusLabel={getPayrollStatusLabel}
        />

        <PayrollPayItemModal
          t={t}
          open={payItemModal.open}
          onClose={closePayItemModal}
          payItemModal={payItemModal}
          formatMoney={formatMoney}
          payItemForm={payItemForm}
          setPayItemForm={setPayItemForm}
          busy={busy}
          onPayItem={handlePayItem}
        />

        <PayrollEmployeeConfigModal
          t={t}
          open={employeeConfigModal.open}
          onClose={closeEmployeeConfigModal}
          employeeConfigModal={employeeConfigModal}
          setEmployeeConfigModal={setEmployeeConfigModal}
          busy={busy}
          onSave={handleSaveEmployeeConfig}
          getPayrollStatusLabel={getPayrollStatusLabel}
        />

        <PayrollRateEditModal
          t={t}
          open={rateEditModal.open}
          onClose={closeRateEditModal}
          rateEditModal={rateEditModal}
          setRateEditModal={setRateEditModal}
          busy={busy}
          teacherComboboxOptions={teacherComboboxOptions}
          subjects={subjects}
          onSave={handleSubmitRateEdit}
        />

        <ConfirmModal {...confirmModalProps} loading={busy} />
      </div>
    </AutoTranslate>
  );
}





