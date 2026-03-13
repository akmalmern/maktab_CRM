import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useAppSelector } from '../../../../app/hooks';
import AutoTranslate from '../../../../components/AutoTranslate';
import {
  Card,
  Tabs,
} from '../../../../components/ui';
import { getErrorMessage } from '../../../../lib/apiClient';
import { saveDownloadedFile } from '../../../../lib/downloadUtils';
import { useLazyGetTeachersQuery } from '../../../../services/api/peopleApi';
import { useGetSubjectsQuery } from '../../../../services/api/subjectsApi';
import {
  useAddPayrollAdjustmentMutation,
  useApprovePayrollRunMutation,
  useCreatePayrollSubjectRateMutation,
  useCreatePayrollTeacherRateMutation,
  useDeletePayrollSubjectRateMutation,
  useDeletePayrollTeacherRateMutation,
  useExportPayrollRunExcelMutation,
  useGetPayrollAutomationHealthQuery,
  useGetPayrollEmployeesQuery,
  useGetPayrollMonthlyReportQuery,
  useGeneratePayrollRunMutation,
  useGetPayrollRunDetailQuery,
  useGetPayrollRunsQuery,
  useLazyGetPayrollSubjectRatesQuery,
  useLazyGetPayrollTeacherRatesQuery,
  usePayPayrollItemMutation,
  usePayPayrollRunMutation,
  useReversePayrollRunMutation,
  useRunPayrollAutomationMutation,
  useUpdatePayrollEmployeeConfigMutation,
  useUpdatePayrollSubjectRateMutation,
  useUpdatePayrollTeacherRateMutation,
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
  RATES_PAGE_LIMIT,
  buildOwnerKey,
  createRatesDataset,
  formatEmployeeConfigName,
  formatMoneyRaw,
  formatOwnerName,
  getCurrentMonthKey,
  getPayrollStatusLabel,
  parseOwnerKey,
  resolveLocale,
  toDateInput,
} from './payroll/payrollSectionModel';
import { usePayrollRunItems } from './payroll/usePayrollRunItems';


export default function PayrollSection() {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const formatMoney = useCallback((value) => formatMoneyRaw(value, locale), [locale]);
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
  const [teacherRatesDataset, setTeacherRatesDataset] = useState(createRatesDataset);
  const [subjectRatesDataset, setSubjectRatesDataset] = useState(createRatesDataset);
  const [loadPayrollTeacherRates] = useLazyGetPayrollTeacherRatesQuery();
  const [loadPayrollSubjectRates] = useLazyGetPayrollSubjectRatesQuery();
  const [loadTeachersPage] = useLazyGetTeachersQuery();
  const [teacherDirectory, setTeacherDirectory] = useState({
    items: [],
    total: 0,
    loading: false,
    partial: false,
    error: null,
  });
  const subjectsQuery = useGetSubjectsQuery(undefined, { skip: isManagerView });
  const teachers = useMemo(() => teacherDirectory.items || [], [teacherDirectory.items]);
  const subjects = useMemo(() => subjectsQuery.data?.subjects || [], [subjectsQuery.data?.subjects]);

  useEffect(() => {
    if (isManagerView) {
      setTeacherDirectory({
        items: [],
        total: 0,
        loading: false,
        partial: false,
        error: null,
      });
      return;
    }

    let cancelled = false;
    async function loadAllTeachers() {
      setTeacherDirectory((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      const accumulated = [];
      let total = 0;
      let page = 1;
      const limit = 100;

      try {
        while (true) {
          const response = await loadTeachersPage(
            { page, limit, filter: 'all', sort: 'name:asc', status: 'active' },
            true,
          ).unwrap();
          const rows = response?.teachers || [];
          const pages = Math.max(Number(response?.pages || 1), 1);
          total = Number(response?.total || 0);
          accumulated.push(...rows);
          if (!rows.length || accumulated.length >= total || page >= pages) break;
          page += 1;
        }
        if (cancelled) return;
        setTeacherDirectory({
          items: accumulated,
          total,
          loading: false,
          partial: accumulated.length < total,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setTeacherDirectory({
          items: accumulated,
          total,
          loading: false,
          partial: true,
          error: getErrorMessage(error),
        });
      }
    }

    loadAllTeachers();
    return () => {
      cancelled = true;
    };
  }, [isManagerView, loadTeachersPage]);

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

  const [generatePayrollRun, generatePayrollRunState] = useGeneratePayrollRunMutation();
  const [runPayrollAutomation, runPayrollAutomationState] = useRunPayrollAutomationMutation();
  const [createPayrollTeacherRate, createTeacherRateState] = useCreatePayrollTeacherRateMutation();
  const [updatePayrollTeacherRate, updateTeacherRateState] = useUpdatePayrollTeacherRateMutation();
  const [deletePayrollTeacherRate, deleteTeacherRateState] = useDeletePayrollTeacherRateMutation();
  const [createPayrollSubjectRate, createSubjectRateState] = useCreatePayrollSubjectRateMutation();
  const [updatePayrollSubjectRate, updateSubjectRateState] = useUpdatePayrollSubjectRateMutation();
  const [deletePayrollSubjectRate, deleteSubjectRateState] = useDeletePayrollSubjectRateMutation();
  const [addPayrollAdjustment, addAdjustmentState] = useAddPayrollAdjustmentMutation();
  const [updatePayrollEmployeeConfig, updatePayrollEmployeeConfigState] = useUpdatePayrollEmployeeConfigMutation();
  const [approvePayrollRun, approvePayrollRunState] = useApprovePayrollRunMutation();
  const [payPayrollRun, payPayrollRunState] = usePayPayrollRunMutation();
  const [payPayrollItem, payPayrollItemState] = usePayPayrollItemMutation();
  const [reversePayrollRun, reversePayrollRunState] = useReversePayrollRunMutation();
  const [exportPayrollRunExcel, exportPayrollRunExcelState] = useExportPayrollRunExcelMutation();
  const shouldLoadRatesPanel = !isManagerView && tab === 'settings' && settingsTab === 'rates';

  const mergeRatesPage = useCallback((prev, response, targetPage) => {
    const incoming = response?.rates || [];
    const total = Number(response?.total || 0);
    const pages = Math.max(Number(response?.pages || 1), 1);
    const nextRates = targetPage <= 1
      ? incoming
      : [
          ...prev.rates,
          ...incoming.filter((row) => !prev.rates.some((existing) => existing.id === row.id)),
        ];
    return {
      rates: nextRates,
      page: targetPage,
      pages,
      total,
      loading: false,
      error: null,
      partial: nextRates.length < total,
    };
  }, []);

  const loadTeacherRatesPage = useCallback(async (targetPage) => {
    setTeacherRatesDataset((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));
    try {
      const response = await loadPayrollTeacherRates(
        { page: targetPage, limit: RATES_PAGE_LIMIT },
        true,
      ).unwrap();
      setTeacherRatesDataset((prev) => mergeRatesPage(prev, response, targetPage));
    } catch (error) {
      setTeacherRatesDataset((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error),
        partial: true,
      }));
    }
  }, [loadPayrollTeacherRates, mergeRatesPage]);

  const loadSubjectRatesPage = useCallback(async (targetPage) => {
    setSubjectRatesDataset((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));
    try {
      const response = await loadPayrollSubjectRates(
        { page: targetPage, limit: RATES_PAGE_LIMIT },
        true,
      ).unwrap();
      setSubjectRatesDataset((prev) => mergeRatesPage(prev, response, targetPage));
    } catch (error) {
      setSubjectRatesDataset((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error),
        partial: true,
      }));
    }
  }, [loadPayrollSubjectRates, mergeRatesPage]);

  const loadMoreTeacherRates = useCallback(() => {
    if (teacherRatesDataset.loading) return;
    if (!teacherRatesDataset.pages || teacherRatesDataset.page >= teacherRatesDataset.pages) return;
    loadTeacherRatesPage(teacherRatesDataset.page + 1);
  }, [teacherRatesDataset.loading, teacherRatesDataset.page, teacherRatesDataset.pages, loadTeacherRatesPage]);

  const loadMoreSubjectRates = useCallback(() => {
    if (subjectRatesDataset.loading) return;
    if (!subjectRatesDataset.pages || subjectRatesDataset.page >= subjectRatesDataset.pages) return;
    loadSubjectRatesPage(subjectRatesDataset.page + 1);
  }, [subjectRatesDataset.loading, subjectRatesDataset.page, subjectRatesDataset.pages, loadSubjectRatesPage]);

  useEffect(() => {
    if (!shouldLoadRatesPanel) return;
    loadTeacherRatesPage(1);
    loadSubjectRatesPage(1);
  }, [
    shouldLoadRatesPanel,
    loadTeacherRatesPage,
    loadSubjectRatesPage,
    createTeacherRateState.isSuccess,
    updateTeacherRateState.isSuccess,
    deleteTeacherRateState.isSuccess,
    createSubjectRateState.isSuccess,
    updateSubjectRateState.isSuccess,
    deleteSubjectRateState.isSuccess,
  ]);

  const payrollTeacherRatesQuery = {
    data: {
      rates: teacherRatesDataset.rates,
      page: teacherRatesDataset.page,
      pages: teacherRatesDataset.pages,
      total: teacherRatesDataset.total,
      limit: RATES_PAGE_LIMIT,
    },
    isLoading: teacherRatesDataset.loading && teacherRatesDataset.page <= 1,
    isFetching: teacherRatesDataset.loading,
    error: teacherRatesDataset.error ? { message: teacherRatesDataset.error } : null,
    partial: teacherRatesDataset.partial,
    hasMore: teacherRatesDataset.page < teacherRatesDataset.pages,
    loadingMore: teacherRatesDataset.loading && teacherRatesDataset.page > 0,
  };
  const payrollSubjectRatesQuery = {
    data: {
      rates: subjectRatesDataset.rates,
      page: subjectRatesDataset.page,
      pages: subjectRatesDataset.pages,
      total: subjectRatesDataset.total,
      limit: RATES_PAGE_LIMIT,
    },
    isLoading: subjectRatesDataset.loading && subjectRatesDataset.page <= 1,
    isFetching: subjectRatesDataset.loading,
    error: subjectRatesDataset.error ? { message: subjectRatesDataset.error } : null,
    partial: subjectRatesDataset.partial,
    hasMore: subjectRatesDataset.page < subjectRatesDataset.pages,
    loadingMore: subjectRatesDataset.loading && subjectRatesDataset.page > 0,
  };

  const selectedRun = payrollRunDetailQuery.data?.run || null;
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


  const busy =
    generatePayrollRunState.isLoading ||
    runPayrollAutomationState.isLoading ||
    createTeacherRateState.isLoading ||
    updateTeacherRateState.isLoading ||
    deleteTeacherRateState.isLoading ||
    createSubjectRateState.isLoading ||
    updateSubjectRateState.isLoading ||
    deleteSubjectRateState.isLoading ||
    addAdjustmentState.isLoading ||
    updatePayrollEmployeeConfigState.isLoading ||
    approvePayrollRunState.isLoading ||
    payPayrollRunState.isLoading ||
    payPayrollItemState.isLoading ||
    reversePayrollRunState.isLoading ||
    exportPayrollRunExcelState.isLoading;

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

  async function handleGenerateRun() {
    if (!periodMonth) {
      toast.error(t('Oy tanlang'));
      return;
    }
    try {
      const res = await generatePayrollRun({ periodMonth }).unwrap();
      toast.success(t("Oylik hisob-kitobi yaratildi"));
      setRunFilters((prev) => ({ ...prev, periodMonth, page: 1 }));
      if (res?.run?.id) {
        setSelectedRunId(res.run.id);
      }
    } catch (error) {
      const payload = error?.data?.error?.meta || error?.data?.meta;
      if (payload?.totalMissing) {
        toast.error(
          t("Soat narxi topilmagan darslar bor: {{count}} ta", {
            count: payload.totalMissing,
            defaultValue: `Soat narxi topilmagan darslar bor: ${payload.totalMissing} ta`,
          }),
        );
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  }

  async function handleCreateTeacherRate() {
    try {
      await createPayrollTeacherRate({
        teacherId: teacherRateForm.teacherId,
        subjectId: teacherRateForm.subjectId,
        ratePerHour: Number(teacherRateForm.ratePerHour),
        effectiveFrom: teacherRateForm.effectiveFrom,
        ...(teacherRateForm.effectiveTo ? { effectiveTo: teacherRateForm.effectiveTo } : {}),
        ...(teacherRateForm.note ? { note: teacherRateForm.note } : {}),
      }).unwrap();
      toast.success(t("O'qituvchi stavkasi saqlandi"));
      setTeacherRateForm((prev) => ({ ...prev, ratePerHour: '', note: '' }));
      setRateCreateDrawer((prev) => ({ ...prev, open: false }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const handleDeleteTeacherRate = useCallback(async (rateId) => {
    const ok = window.confirm(t("O'qituvchi stavkasini o'chirmoqchimisiz?"));
    if (!ok) return;
    try {
      await deletePayrollTeacherRate(rateId).unwrap();
      toast.success(t("O'qituvchi stavkasi o'chirildi"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [deletePayrollTeacherRate, t]);

  async function handleCreateSubjectRate() {
    try {
      await createPayrollSubjectRate({
        subjectId: subjectRateForm.subjectId,
        ratePerHour: Number(subjectRateForm.ratePerHour),
        effectiveFrom: subjectRateForm.effectiveFrom,
        ...(subjectRateForm.effectiveTo ? { effectiveTo: subjectRateForm.effectiveTo } : {}),
        ...(subjectRateForm.note ? { note: subjectRateForm.note } : {}),
      }).unwrap();
      toast.success(t("Fan bo'yicha standart stavka saqlandi"));
      setSubjectRateForm((prev) => ({ ...prev, ratePerHour: '', note: '' }));
      setRateCreateDrawer((prev) => ({ ...prev, open: false }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const handleDeleteSubjectRate = useCallback(async (rateId) => {
    const ok = window.confirm(t("Fan bo'yicha standart stavkani o'chirmoqchimisiz?"));
    if (!ok) return;
    try {
      await deletePayrollSubjectRate(rateId).unwrap();
      toast.success(t("Fan bo'yicha standart stavka o'chirildi"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [deletePayrollSubjectRate, t]);

  function openRateCreateDrawer(kind) {
    setRateCreateDrawer({ open: true, kind });
  }

  function closeRateCreateDrawer() {
    setRateCreateDrawer((prev) => ({ ...prev, open: false }));
  }

  const openTeacherRateEditModal = useCallback((row) => {
    setRateEditModal({
      open: true,
      kind: 'teacher',
      rateId: row.id,
      teacherId: row.teacherId || '',
      subjectId: row.subjectId || '',
      ratePerHour: String(row.ratePerHour ?? ''),
      effectiveFrom: toDateInput(row.effectiveFrom),
      effectiveTo: toDateInput(row.effectiveTo),
      note: row.note || '',
    });
  }, []);

  const openSubjectRateEditModal = useCallback((row) => {
    setRateEditModal({
      open: true,
      kind: 'subject',
      rateId: row.id,
      teacherId: '',
      subjectId: row.subjectId || '',
      ratePerHour: String(row.ratePerHour ?? ''),
      effectiveFrom: toDateInput(row.effectiveFrom),
      effectiveTo: toDateInput(row.effectiveTo),
      note: row.note || '',
    });
  }, []);

  function closeRateEditModal() {
    setRateEditModal((prev) => ({ ...prev, open: false }));
  }

  async function handleSubmitRateEdit() {
    if (!rateEditModal.rateId || !rateEditModal.subjectId || !rateEditModal.ratePerHour || !rateEditModal.effectiveFrom) {
      toast.error(t("Majburiy maydonlarni to'ldiring"));
      return;
    }

    try {
      const payload = {
        subjectId: rateEditModal.subjectId,
        ratePerHour: Number(rateEditModal.ratePerHour),
        effectiveFrom: rateEditModal.effectiveFrom,
        ...(rateEditModal.effectiveTo ? { effectiveTo: rateEditModal.effectiveTo } : { effectiveTo: null }),
        ...(rateEditModal.note ? { note: rateEditModal.note } : { note: '' }),
      };

      if (rateEditModal.kind === 'teacher') {
        if (!rateEditModal.teacherId) {
          toast.error(t("O'qituvchi tanlang"));
          return;
        }
        await updatePayrollTeacherRate({
          rateId: rateEditModal.rateId,
          payload: { ...payload, teacherId: rateEditModal.teacherId },
        }).unwrap();
        toast.success(t("O'qituvchi stavkasi yangilandi"));
      } else {
        await updatePayrollSubjectRate({
          rateId: rateEditModal.rateId,
          payload,
        }).unwrap();
        toast.success(t("Fan stavkasi yangilandi"));
      }

      closeRateEditModal();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleAddAdjustment() {
    if (!activeRunId) {
      toast.error(t("Hisob-kitobni tanlang"));
      return;
    }
    const ownerFilter = parseOwnerKey(adjustmentForm.ownerKey);
    if (!ownerFilter.teacherId && !ownerFilter.employeeId) {
      toast.error(t("Xodim yoki o'qituvchi tanlang"));
      return;
    }
    try {
      await addPayrollAdjustment({
        runId: activeRunId,
        payload: {
          ...ownerFilter,
          type: adjustmentForm.type,
          amount: Number(adjustmentForm.amount),
          description: adjustmentForm.description,
        },
      }).unwrap();
      toast.success(t("Tuzatma qo'shildi"));
      setAdjustmentForm((prev) => ({ ...prev, amount: '', description: '' }));
      setAdjustmentDrawerOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const handleApproveRun = useCallback(async () => {
    if (!activeRunId) return;
    const ok = window.confirm(t("Hisob-kitobni tasdiqlaysizmi?"));
    if (!ok) return;
    try {
      await approvePayrollRun(activeRunId).unwrap();
      toast.success(t("Hisob-kitob tasdiqlandi"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [activeRunId, approvePayrollRun, t]);

  const handlePayRun = useCallback(async () => {
    if (!activeRunId) return;
    try {
      await payPayrollRun({
        runId: activeRunId,
        payload: {
          paymentMethod: payForm.paymentMethod,
          ...(payForm.paidAt ? { paidAt: payForm.paidAt } : {}),
          ...(payForm.externalRef ? { externalRef: payForm.externalRef } : {}),
          ...(payForm.note ? { note: payForm.note } : {}),
        },
      }).unwrap();
      toast.success(t("Hisob-kitob to'landi (to'langan holat)"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [activeRunId, payPayrollRun, payForm, t]);

  const openPayItemModal = useCallback((row) => {
    const snapshotName = `${row.teacherFirstNameSnapshot || ''} ${row.teacherLastNameSnapshot || ''}`.trim();
    const ownerLabel = formatOwnerName({
      teacher: row.teacher,
      employee: row.employee,
      fallbackName: snapshotName,
      fallbackId: row.teacherId || row.employeeId || '',
    });
    const payableAmount = Math.max(0, Number(row.payableAmount || 0));
    const paidAmount = Number(row.paidAmount || 0);
    const remaining = Math.max(0, payableAmount - paidAmount);
    setPayItemModal({
      open: true,
      itemId: row.id,
      ownerLabel,
      payableAmount,
      paidAmount,
    });
    setPayItemForm((prev) => ({
      ...prev,
      amount: remaining > 0 ? String(remaining) : '',
    }));
  }, []);

  const closePayItemModal = useCallback(() => {
    setPayItemModal({
      open: false,
      itemId: '',
      ownerLabel: '',
      payableAmount: 0,
      paidAmount: 0,
    });
    setPayItemForm({
      amount: '',
      paymentMethod: 'BANK',
      paidAt: '',
      externalRef: '',
      note: '',
    });
  }, []);

  async function handlePayItem() {
    if (!activeRunId || !payItemModal.itemId) return;
    if (!payItemForm.amount) {
      toast.error(t("To'lov summasini kiriting"));
      return;
    }
    try {
      await payPayrollItem({
        runId: activeRunId,
        itemId: payItemModal.itemId,
        payload: {
          amount: Number(payItemForm.amount),
          paymentMethod: payItemForm.paymentMethod,
          ...(payItemForm.paidAt ? { paidAt: payItemForm.paidAt } : {}),
          ...(payItemForm.externalRef ? { externalRef: payItemForm.externalRef } : {}),
          ...(payItemForm.note ? { note: payItemForm.note } : {}),
        },
      }).unwrap();
      toast.success(t("Xodim bo'yicha to'lov qayd etildi"));
      closePayItemModal();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const openEmployeeConfigModal = useCallback((row) => {
    const fixedSalary = row?.fixedSalaryAmount == null ? '' : String(Number(row.fixedSalaryAmount || 0));
    setEmployeeConfigModal({
      open: true,
      employeeId: row.id,
      displayName: formatEmployeeConfigName(row),
      payrollMode: row.payrollMode || 'LESSON_BASED',
      fixedSalaryAmount: fixedSalary,
      isPayrollEligible: Boolean(row.isPayrollEligible),
      employmentStatus: row.employmentStatus || 'ACTIVE',
      note: row.note || '',
    });
  }, []);

  const closeEmployeeConfigModal = useCallback(() => {
    setEmployeeConfigModal({
      open: false,
      employeeId: '',
      displayName: '',
      payrollMode: 'LESSON_BASED',
      fixedSalaryAmount: '',
      isPayrollEligible: true,
      employmentStatus: 'ACTIVE',
      note: '',
    });
  }, []);

  async function handleSaveEmployeeConfig() {
    if (!employeeConfigModal.employeeId) return;

    const hasFixedSalaryValue = String(employeeConfigModal.fixedSalaryAmount || '').trim() !== '';
    const fixedSalaryAmount = hasFixedSalaryValue ? Number(employeeConfigModal.fixedSalaryAmount) : null;
    if (hasFixedSalaryValue && (!Number.isFinite(fixedSalaryAmount) || fixedSalaryAmount < 0)) {
      toast.error(t("Oklad summasi noto'g'ri"));
      return;
    }
    if (
      ['FIXED', 'MIXED'].includes(employeeConfigModal.payrollMode)
      && (!Number.isFinite(fixedSalaryAmount) || fixedSalaryAmount <= 0)
    ) {
      toast.error(t("FIXED/MIXED rejimda oklad summasi musbat bo'lishi shart"));
      return;
    }

    try {
      await updatePayrollEmployeeConfig({
        employeeId: employeeConfigModal.employeeId,
        payload: {
          payrollMode: employeeConfigModal.payrollMode,
          fixedSalaryAmount,
          ...(employeeConfigModal.payrollMode !== 'MANUAL_ONLY'
            ? { isPayrollEligible: Boolean(employeeConfigModal.isPayrollEligible) }
            : {}),
          note: employeeConfigModal.note || '',
        },
      }).unwrap();
      toast.success(t("Oylik konfiguratsiyasi saqlandi"));
      closeEmployeeConfigModal();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleReverseRun() {
    if (!activeRunId) return;
    try {
      await reversePayrollRun({
        runId: activeRunId,
        payload: { reason: reverseReason },
      }).unwrap();
      toast.success(t("Hisob-kitob bekor qilindi"));
      setReverseReason('');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleExportRunExcel() {
    if (!activeRunId) {
      toast.error(t("Hisob-kitobni tanlang"));
      return;
    }
    try {
      const result = await exportPayrollRunExcel({
        runId: activeRunId,
        params: {
          ...(lineOwnerFilter.teacherId ? { teacherId: lineOwnerFilter.teacherId } : {}),
          ...(lineOwnerFilter.employeeId ? { employeeId: lineOwnerFilter.employeeId } : {}),
          ...(lineFilters.type ? { type: lineFilters.type } : {}),
        },
      }).unwrap();
      const fallbackName = `payroll-${selectedRun?.periodMonth || 'run'}.xlsx`;
      saveDownloadedFile({ blob: result.blob, fileName: result.fileName, fallbackName });
      toast.success(t('{{format}} fayl yuklab olindi', { format: 'Excel' }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function buildAutomationPayload({ dryRun = false } = {}) {
    const payload = {
      periodMonth,
      generate: true,
      autoApprove: true,
      autoPay: false,
      force: Boolean(automationForm.force),
      dryRun,
    };

    if (automationForm.mode === 'GENERATE_ONLY') {
      payload.autoApprove = false;
      payload.autoPay = false;
      return payload;
    }
    if (automationForm.mode === 'FULL_PAY') {
      payload.autoApprove = true;
      payload.autoPay = true;
      payload.paymentMethod = automationForm.paymentMethod || 'BANK';
      return payload;
    }

    return payload;
  }

  async function handleRunAutomation({ dryRun = false } = {}) {
    if (!periodMonth) {
      toast.error(t('Oy tanlang'));
      return;
    }

    try {
      const result = await runPayrollAutomation(buildAutomationPayload({ dryRun })).unwrap();
      const doneSteps = (result?.steps || [])
        .filter((step) => step.status === 'DONE')
        .map((step) => step.step)
        .join(' -> ');
      if (dryRun) {
        toast.success(
          doneSteps
            ? t("Sinov rejimi yakunlandi: {{steps}}", { steps: doneSteps })
            : t("Sinov rejimi yakunlandi"),
        );
      } else {
        toast.success(
          doneSteps
            ? t("Avto jarayon yakunlandi: {{steps}}", { steps: doneSteps })
            : t("Avto jarayon yakunlandi"),
        );
      }
      setRunFilters((prev) => ({ ...prev, periodMonth, page: 1 }));
      if (result?.run?.id) {
        setSelectedRunId(result.run.id);
      }
      payrollRunsQuery.refetch();
      payrollAutomationHealthQuery.refetch();
      payrollMonthlyReportQuery.refetch();
    } catch (error) {
      const blockerCount = Number(error?.data?.error?.meta?.health?.summary?.blockerCount || 0);
      if (error?.data?.error?.code === 'PAYROLL_AUTOMATION_BLOCKED' && blockerCount > 0) {
        toast.error(
          t("Avto jarayon to'xtadi. To'siqlar soni: {{count}}", { count: blockerCount }),
        );
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  }

  const handleRefreshRunsDashboard = useCallback(() => {
    payrollRunsQuery.refetch();
    payrollAutomationHealthQuery.refetch();
    payrollMonthlyReportQuery.refetch();
    if (activeRunId) {
      payrollRunDetailQuery.refetch();
    }
  }, [
    activeRunId,
    payrollAutomationHealthQuery,
    payrollMonthlyReportQuery,
    payrollRunDetailQuery,
    payrollRunsQuery,
  ]);
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

  useEffect(() => {
    setLineFilters((prev) => ({ ...prev, page: 1 }));
  }, [activeRunId]);

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
          setSelectedRunId={setSelectedRunId}
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
      </div>
    </AutoTranslate>
  );
}





