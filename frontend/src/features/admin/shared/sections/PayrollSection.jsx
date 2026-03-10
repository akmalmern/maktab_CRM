import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useAppSelector } from '../../../../app/hooks';
import AutoTranslate from '../../../../components/AutoTranslate';
import {
  Button,
  Card,
  Combobox,
  DataTable,
  Drawer,
  Input,
  Modal,
  MoneyInputUz,
  Select,
  StateView,
  Tabs,
  Textarea,
} from '../../../../components/ui';
import { getErrorMessage } from '../../../../lib/apiClient';
import { saveDownloadedFile } from '../../../../lib/downloadUtils';
import { useGetTeachersQuery } from '../../../../services/api/peopleApi';
import { useGetSubjectsQuery } from '../../../../services/api/subjectsApi';
import { useGetClassroomsQuery } from '../../../../services/api/classroomsApi';
import {
  useAddPayrollAdjustmentMutation,
  useApprovePayrollRunMutation,
  useCreatePayrollAdvanceMutation,
  useCreatePayrollRealLessonMutation,
  useCreatePayrollSubjectRateMutation,
  useCreatePayrollTeacherRateMutation,
  useBulkUpdatePayrollRealLessonStatusMutation,
  useDeletePayrollAdvanceMutation,
  useDeletePayrollSubjectRateMutation,
  useDeletePayrollTeacherRateMutation,
  useExportPayrollRunCsvMutation,
  useGetPayrollAdvancesQuery,
  useGetPayrollAutomationHealthQuery,
  useGetPayrollEmployeesQuery,
  useGetPayrollMonthlyReportQuery,
  useGeneratePayrollRunMutation,
  useGetPayrollRealLessonsQuery,
  useGetPayrollRunDetailQuery,
  useGetPayrollRunsQuery,
  useGetPayrollSubjectRatesQuery,
  useGetPayrollTeacherRatesQuery,
  usePayPayrollItemMutation,
  usePayPayrollRunMutation,
  useReversePayrollRunMutation,
  useRunPayrollAutomationMutation,
  useUpdatePayrollEmployeeConfigMutation,
  useUpdatePayrollRealLessonStatusMutation,
  useUpdatePayrollSubjectRateMutation,
  useUpdatePayrollTeacherRateMutation,
} from '../../../../services/api/payrollApi';

function getCurrentMonthKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('uz-UZ').format(Number.isFinite(n) ? n : 0);
}

function formatHours(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('uz-UZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n);
}

function formatPersonLabel(person, fallback = '') {
  if (!person) return fallback;
  const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();
  const username = person.user?.username || '';
  if (fullName && username) return `${fullName} (@${username})`;
  return fullName || (username ? `@${username}` : fallback);
}

function buildOwnerKey({ teacherId, employeeId }) {
  if (teacherId) return `teacher:${teacherId}`;
  if (employeeId) return `employee:${employeeId}`;
  return '';
}

function parseOwnerKey(ownerKey) {
  const value = String(ownerKey || '');
  if (value.startsWith('teacher:')) {
    const teacherId = value.slice('teacher:'.length).trim();
    return teacherId ? { teacherId } : {};
  }
  if (value.startsWith('employee:')) {
    const employeeId = value.slice('employee:'.length).trim();
    return employeeId ? { employeeId } : {};
  }
  return {};
}

function formatOwnerName({ teacher, employee, fallbackName = '', fallbackId = '' }) {
  return (
    formatPersonLabel(teacher, '') ||
    formatPersonLabel(employee, '') ||
    fallbackName ||
    fallbackId ||
    '-'
  );
}

function formatEmployeeConfigName(row) {
  const teacherName = `${row?.teacher?.firstName || ''} ${row?.teacher?.lastName || ''}`.trim();
  const employeeName = `${row?.firstName || ''} ${row?.lastName || ''}`.trim();
  const username = row?.user?.username ? `@${row.user.username}` : '';
  const base = teacherName || employeeName || row?.id || '-';
  return username ? `${base} (${username})` : base;
}

function StatusPill({ value }) {
  const colorMap = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    APPROVED: 'bg-amber-50 text-amber-700 border-amber-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REVERSED: 'bg-rose-50 text-rose-700 border-rose-200',
    DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELED: 'bg-slate-100 text-slate-700 border-slate-200',
    REPLACED: 'bg-violet-50 text-violet-700 border-violet-200',
    LESSON: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    FIXED_SALARY: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    ADVANCE_DEDUCTION: 'bg-amber-50 text-amber-700 border-amber-200',
    BONUS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENALTY: 'bg-rose-50 text-rose-700 border-rose-200',
    MANUAL: 'bg-slate-100 text-slate-700 border-slate-200',
    LESSON_BASED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    FIXED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    MIXED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MANUAL_ONLY: 'bg-slate-100 text-slate-700 border-slate-200',
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INACTIVE: 'bg-amber-50 text-amber-700 border-amber-200',
    ARCHIVED: 'bg-rose-50 text-rose-700 border-rose-200',
    UNPAID: 'bg-slate-100 text-slate-700 border-slate-200',
    PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${colorMap[value] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      {value || '-'}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function StatWidget({ label, value, tone = 'slate', subtitle }) {
  const toneClasses = {
    slate: 'border-slate-200 bg-slate-50',
    indigo: 'border-indigo-200 bg-indigo-50/60',
    emerald: 'border-emerald-200 bg-emerald-50/60',
    amber: 'border-amber-200 bg-amber-50/60',
    rose: 'border-rose-200 bg-rose-50/60',
  };

  return (
    <div className={`rounded-xl border p-3 ${toneClasses[tone] || toneClasses.slate}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
    </div>
  );
}

const DEFAULT_RUN_FILTERS = { page: 1, limit: 20, status: '', periodMonth: '' };
const DEFAULT_LINE_FILTERS = { page: 1, limit: 50, ownerKey: '', type: '' };
const DEFAULT_LESSON_FILTERS = { page: 1, limit: 20, periodMonth: '', status: 'DONE', teacherId: '', subjectId: '', classroomId: '' };
const DEFAULT_ADVANCE_FILTERS = { page: 1, limit: 20, periodMonth: '' };
const DEFAULT_EMPLOYEE_CONFIG_FILTERS = {
  page: 1,
  limit: 20,
  kind: 'TEACHER',
  payrollMode: '',
  employmentStatus: '',
  isPayrollEligible: '',
  search: '',
};

export default function PayrollSection() {
  const { t } = useTranslation();
  const role = useAppSelector((state) => state.auth.role);
  const isManagerView = role === 'MANAGER';
  const isAdminView = role === 'ADMIN';

  const [tab, setTab] = useState('runs');
  const [settingsTab, setSettingsTab] = useState('config');
  const [periodMonth, setPeriodMonth] = useState(getCurrentMonthKey());
  const [selectedRunId, setSelectedRunId] = useState('');
  const [runFilters, setRunFilters] = useState({ ...DEFAULT_RUN_FILTERS, periodMonth: getCurrentMonthKey() });
  const lineFilters = DEFAULT_LINE_FILTERS;
  const [lessonFilters, setLessonFilters] = useState({ ...DEFAULT_LESSON_FILTERS, periodMonth: getCurrentMonthKey() });

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
  const [realLessonForm, setRealLessonForm] = useState({
    teacherId: '',
    subjectId: '',
    classroomId: '',
    startAt: '',
    endAt: '',
    durationMinutes: '',
    status: 'DONE',
    replacedByTeacherId: '',
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
  const [advanceFilters, setAdvanceFilters] = useState({ ...DEFAULT_ADVANCE_FILTERS, periodMonth: getCurrentMonthKey() });
  const [advanceForm, setAdvanceForm] = useState({
    periodMonth: getCurrentMonthKey(),
    teacherId: '',
    amount: '',
    paidAt: '',
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
  const [lessonStatusModal, setLessonStatusModal] = useState({
    open: false,
    lessonId: '',
    currentStatus: '',
    status: 'DONE',
    replacedByTeacherId: '',
    note: '',
    lessonLabel: '',
  });
  const [rateCreateDrawer, setRateCreateDrawer] = useState({ open: false, kind: 'teacher' });
  const [adjustmentDrawerOpen, setAdjustmentDrawerOpen] = useState(false);
  const [selectedRealLessonIds, setSelectedRealLessonIds] = useState([]);
  const [bulkLessonStatusForm, setBulkLessonStatusForm] = useState({
    status: 'DONE',
    replacedByTeacherId: '',
    note: '',
  });

  const teacherListQuery = useGetTeachersQuery(
    { page: 1, limit: 100, filter: 'all', sort: 'name:asc' },
    { skip: isManagerView },
  );
  const subjectsQuery = useGetSubjectsQuery(undefined, { skip: isManagerView });
  const classroomsQuery = useGetClassroomsQuery(undefined, { skip: isManagerView });

  const teachers = useMemo(() => teacherListQuery.data?.teachers || [], [teacherListQuery.data?.teachers]);
  const subjects = useMemo(() => subjectsQuery.data?.subjects || [], [subjectsQuery.data?.subjects]);
  const classrooms = useMemo(() => classroomsQuery.data?.classrooms || [], [classroomsQuery.data?.classrooms]);

  const payrollRunsQuery = useGetPayrollRunsQuery({
    page: runFilters.page,
    limit: runFilters.limit,
    ...(runFilters.status ? { status: runFilters.status } : {}),
    ...(runFilters.periodMonth ? { periodMonth: runFilters.periodMonth } : {}),
  });
  const payrollAutomationHealthQuery = useGetPayrollAutomationHealthQuery(
    {
      periodMonth,
      includeDetails: true,
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

  const payrollTeacherRatesQuery = useGetPayrollTeacherRatesQuery(
    { page: 1, limit: 100 },
    { skip: isManagerView || tab !== 'settings' || settingsTab !== 'rates' },
  );
  const payrollSubjectRatesQuery = useGetPayrollSubjectRatesQuery(
    { page: 1, limit: 100 },
    { skip: isManagerView || tab !== 'settings' || settingsTab !== 'rates' },
  );
  const payrollRealLessonsQuery = useGetPayrollRealLessonsQuery(
    {
      page: lessonFilters.page,
      limit: lessonFilters.limit,
      ...(lessonFilters.periodMonth ? { periodMonth: lessonFilters.periodMonth } : {}),
      ...(lessonFilters.status ? { status: lessonFilters.status } : {}),
      ...(lessonFilters.teacherId ? { teacherId: lessonFilters.teacherId } : {}),
      ...(lessonFilters.subjectId ? { subjectId: lessonFilters.subjectId } : {}),
      ...(lessonFilters.classroomId ? { classroomId: lessonFilters.classroomId } : {}),
    },
    { skip: isManagerView || tab !== 'settings' || settingsTab !== 'lessons' },
  );
  const payrollAdvancesQuery = useGetPayrollAdvancesQuery(
    {
      page: advanceFilters.page,
      limit: advanceFilters.limit,
      ...(advanceFilters.periodMonth ? { periodMonth: advanceFilters.periodMonth } : {}),
    },
    { skip: isManagerView || tab !== 'settings' || settingsTab !== 'advances' },
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
  const [createPayrollAdvance, createAdvanceState] = useCreatePayrollAdvanceMutation();
  const [createPayrollTeacherRate, createTeacherRateState] = useCreatePayrollTeacherRateMutation();
  const [updatePayrollTeacherRate, updateTeacherRateState] = useUpdatePayrollTeacherRateMutation();
  const [deletePayrollTeacherRate, deleteTeacherRateState] = useDeletePayrollTeacherRateMutation();
  const [createPayrollSubjectRate, createSubjectRateState] = useCreatePayrollSubjectRateMutation();
  const [updatePayrollSubjectRate, updateSubjectRateState] = useUpdatePayrollSubjectRateMutation();
  const [deletePayrollSubjectRate, deleteSubjectRateState] = useDeletePayrollSubjectRateMutation();
  const [createPayrollRealLesson, createRealLessonState] = useCreatePayrollRealLessonMutation();
  const [updatePayrollRealLessonStatus, updateRealLessonStatusState] = useUpdatePayrollRealLessonStatusMutation();
  const [bulkUpdatePayrollRealLessonStatus, bulkUpdateRealLessonStatusState] = useBulkUpdatePayrollRealLessonStatusMutation();
  const [addPayrollAdjustment, addAdjustmentState] = useAddPayrollAdjustmentMutation();
  const [deletePayrollAdvance, deleteAdvanceState] = useDeletePayrollAdvanceMutation();
  const [updatePayrollEmployeeConfig, updatePayrollEmployeeConfigState] = useUpdatePayrollEmployeeConfigMutation();
  const [approvePayrollRun, approvePayrollRunState] = useApprovePayrollRunMutation();
  const [payPayrollRun, payPayrollRunState] = usePayPayrollRunMutation();
  const [payPayrollItem, payPayrollItemState] = usePayPayrollItemMutation();
  const [reversePayrollRun, reversePayrollRunState] = useReversePayrollRunMutation();
  const [exportPayrollRunCsv, exportPayrollRunCsvState] = useExportPayrollRunCsvMutation();

  const selectedRun = payrollRunDetailQuery.data?.run || null;
  const selectedRunPaidAmount = useMemo(
    () => (selectedRun?.items || []).reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
    [selectedRun?.items],
  );
  const selectedRunPayableAmount = Number(selectedRun?.payableAmount || 0);
  const selectedRunRemainingAmount = Math.max(0, selectedRunPayableAmount - selectedRunPaidAmount);
  const canEditSelectedRun = isAdminView && selectedRun?.status === 'DRAFT';
  const canApproveSelectedRun = (isAdminView || isManagerView) && selectedRun?.status === 'DRAFT';
  const canPaySelectedRun = isAdminView && selectedRun?.status === 'APPROVED';
  const canReverseSelectedRun = isAdminView && (selectedRun?.status === 'APPROVED' || selectedRun?.status === 'PAID');


  const busy =
    generatePayrollRunState.isLoading ||
    runPayrollAutomationState.isLoading ||
    createAdvanceState.isLoading ||
    createTeacherRateState.isLoading ||
    updateTeacherRateState.isLoading ||
    deleteTeacherRateState.isLoading ||
    createSubjectRateState.isLoading ||
    updateSubjectRateState.isLoading ||
    deleteSubjectRateState.isLoading ||
    createRealLessonState.isLoading ||
    updateRealLessonStatusState.isLoading ||
    bulkUpdateRealLessonStatusState.isLoading ||
    addAdjustmentState.isLoading ||
    deleteAdvanceState.isLoading ||
    updatePayrollEmployeeConfigState.isLoading ||
    approvePayrollRunState.isLoading ||
    payPayrollRunState.isLoading ||
    payPayrollItemState.isLoading ||
    reversePayrollRunState.isLoading ||
    exportPayrollRunCsvState.isLoading;

  const teacherOptionLabel = useCallback(
    (teacher) => `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.user?.username || teacher.id,
    [],
  );

  const teacherMap = useMemo(() => new Map(teachers.map((tRow) => [tRow.id, tRow])), [teachers]);
  const subjectMap = useMemo(() => new Map(subjects.map((sRow) => [sRow.id, sRow])), [subjects]);
  const classroomMap = useMemo(() => new Map(classrooms.map((cRow) => [cRow.id, cRow])), [classrooms]);
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
        label: `${row.label} (Teacher)`,
        searchText: `${row.searchText || ''} Teacher`,
      })),
    [teacherComboboxOptions],
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
      const ownerType = item.teacherId ? 'Teacher' : 'Employee';
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
  }, [selectedRun, teacherOwnerOptions]);
  const realLessonPageIds = useMemo(
    () => ((payrollRealLessonsQuery.data?.realLessons || []).map((row) => row.id).filter(Boolean)),
    [payrollRealLessonsQuery.data?.realLessons],
  );
  const selectedRealLessonIdsOnPage = useMemo(
    () => selectedRealLessonIds.filter((id) => realLessonPageIds.includes(id)),
    [realLessonPageIds, selectedRealLessonIds],
  );
  const allRealLessonsPageSelected =
    realLessonPageIds.length > 0 && realLessonPageIds.every((id) => selectedRealLessonIdsOnPage.includes(id));
  const someRealLessonsPageSelected =
    selectedRealLessonIdsOnPage.length > 0 && !allRealLessonsPageSelected;

  async function handleGenerateRun() {
    if (!periodMonth) {
      toast.error(t('Oy tanlang'));
      return;
    }
    try {
      const res = await generatePayrollRun({ periodMonth }).unwrap();
      toast.success(t('Payroll generate qilindi'));
      setRunFilters((prev) => ({ ...prev, periodMonth, page: 1 }));
      if (res?.run?.id) {
        setSelectedRunId(res.run.id);
      }
    } catch (error) {
      const payload = error?.data?.error?.meta || error?.data?.meta;
      if (payload?.totalMissing) {
        toast.error(
          t("Rate topilmagan darslar bor: {{count}} ta", {
            count: payload.totalMissing,
            defaultValue: `Rate topilmagan darslar bor: ${payload.totalMissing} ta`,
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
      toast.success(t("Teacher rate saqlandi"));
      setTeacherRateForm((prev) => ({ ...prev, ratePerHour: '', note: '' }));
      setRateCreateDrawer((prev) => ({ ...prev, open: false }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const handleDeleteTeacherRate = useCallback(async (rateId) => {
    const ok = window.confirm(t("Teacher rate ni o'chirmoqchimisiz?"));
    if (!ok) return;
    try {
      await deletePayrollTeacherRate(rateId).unwrap();
      toast.success(t("Teacher rate o'chirildi"));
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
      toast.success(t('Subject default rate saqlandi'));
      setSubjectRateForm((prev) => ({ ...prev, ratePerHour: '', note: '' }));
      setRateCreateDrawer((prev) => ({ ...prev, open: false }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const handleDeleteSubjectRate = useCallback(async (rateId) => {
    const ok = window.confirm(t("Subject default rate ni o'chirmoqchimisiz?"));
    if (!ok) return;
    try {
      await deletePayrollSubjectRate(rateId).unwrap();
      toast.success(t("Subject default rate o'chirildi"));
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
        toast.success(t('Teacher rate yangilandi'));
      } else {
        await updatePayrollSubjectRate({
          rateId: rateEditModal.rateId,
          payload,
        }).unwrap();
        toast.success(t('Subject rate yangilandi'));
      }

      closeRateEditModal();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleCreateRealLesson() {
    try {
      await createPayrollRealLesson({
        teacherId: realLessonForm.teacherId,
        subjectId: realLessonForm.subjectId,
        classroomId: realLessonForm.classroomId,
        startAt: realLessonForm.startAt,
        endAt: realLessonForm.endAt,
        ...(realLessonForm.durationMinutes ? { durationMinutes: Number(realLessonForm.durationMinutes) } : {}),
        status: realLessonForm.status,
        ...(realLessonForm.status === 'REPLACED' && realLessonForm.replacedByTeacherId
          ? { replacedByTeacherId: realLessonForm.replacedByTeacherId }
          : {}),
        ...(realLessonForm.note ? { note: realLessonForm.note } : {}),
      }).unwrap();
      toast.success(t('Real lesson qoР В Р вЂ Р В РІР‚С™Р вЂ™Р’Вshildi'));
      setRealLessonForm((prev) => ({ ...prev, durationMinutes: '', note: '' }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const openLessonStatusModal = useCallback((row) => {
    const teacherName = row.teacher
      ? `${row.teacher.firstName || ''} ${row.teacher.lastName || ''}`.trim()
      : teacherOptionLabel(teacherMap.get(row.teacherId) || row);
    setLessonStatusModal({
      open: true,
      lessonId: row.id,
      currentStatus: row.status || '',
      status: row.status || 'DONE',
      replacedByTeacherId: row.replacedByTeacherId || '',
      note: row.note || '',
      lessonLabel: `${teacherName} - ${formatDateTime(row.startAt)}`,
    });
  }, [teacherMap, teacherOptionLabel]);

  function closeLessonStatusModal() {
    setLessonStatusModal((prev) => ({ ...prev, open: false }));
  }

  async function handleSubmitLessonStatus() {
    if (!lessonStatusModal.lessonId) return;
    if (lessonStatusModal.status === 'REPLACED' && !lessonStatusModal.replacedByTeacherId) {
      toast.error(t('Replacement teacher tanlang'));
      return;
    }
    try {
      await updatePayrollRealLessonStatus({
        lessonId: lessonStatusModal.lessonId,
        payload: {
          status: lessonStatusModal.status,
          ...(lessonStatusModal.status === 'REPLACED'
            ? { replacedByTeacherId: lessonStatusModal.replacedByTeacherId }
            : { replacedByTeacherId: null }),
          note: lessonStatusModal.note || null,
        },
      }).unwrap();
      toast.success(t('RealLesson status yangilandi'));
      closeLessonStatusModal();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const toggleRealLessonSelection = useCallback((lessonId, checked) => {
    setSelectedRealLessonIds((prev) => {
      if (checked) {
        if (prev.includes(lessonId)) return prev;
        return [...prev, lessonId];
      }
      return prev.filter((id) => id !== lessonId);
    });
  }, []);

  const toggleSelectAllRealLessonsOnPage = useCallback((checked) => {
    setSelectedRealLessonIds((prev) => {
      const pageIds = realLessonPageIds;
      if (!pageIds.length) return [];
      if (checked) {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return [...next];
      }
      return prev.filter((id) => !pageIds.includes(id));
    });
  }, [realLessonPageIds]);

  async function handleBulkLessonStatusUpdate() {
    if (!selectedRealLessonIdsOnPage.length) {
      toast.error(t('Kamida bitta darsni tanlang'));
      return;
    }
    if (bulkLessonStatusForm.status === 'REPLACED' && !bulkLessonStatusForm.replacedByTeacherId) {
      toast.error(t('Replacement teacher tanlang'));
      return;
    }

    try {
      const result = await bulkUpdatePayrollRealLessonStatus({
        lessonIds: selectedRealLessonIdsOnPage,
        status: bulkLessonStatusForm.status,
        ...(bulkLessonStatusForm.status === 'REPLACED'
          ? { replacedByTeacherId: bulkLessonStatusForm.replacedByTeacherId }
          : { replacedByTeacherId: null }),
        ...(bulkLessonStatusForm.note.trim() ? { note: bulkLessonStatusForm.note } : {}),
      }).unwrap();

      const updatedCount = Number(result?.summary?.updatedCount || 0);
      const skippedCount = Number(result?.summary?.skippedCount || 0);
      if (updatedCount && skippedCount) {
        toast.success(t('Bulk update: {{updated}} ta yangilandi, {{skipped}} ta skip qilindi', { updated: updatedCount, skipped: skippedCount }));
      } else if (updatedCount) {
        toast.success(t('Bulk update: {{updated}} ta dars yangilandi', { updated: updatedCount }));
      } else {
        toast.error(t("Tanlangan darslar yangilanmadi (hammasi skip bo'ldi)"));
      }
      setSelectedRealLessonIds([]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleAddAdjustment() {
    if (!activeRunId) {
      toast.error(t('Payroll run tanlang'));
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
      toast.success(t('Adjustment qoР В Р вЂ Р В РІР‚С™Р вЂ™Р’Вshildi'));
      setAdjustmentForm((prev) => ({ ...prev, amount: '', description: '' }));
      setAdjustmentDrawerOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const handleApproveRun = useCallback(async () => {
    if (!activeRunId) return;
    const ok = window.confirm(t('Payroll run ni tasdiqlaysizmi?'));
    if (!ok) return;
    try {
      await approvePayrollRun(activeRunId).unwrap();
      toast.success(t('Payroll tasdiqlandi'));
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
      toast.success(t("Payroll to'landi (PAID)"));
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
    const payableAmount = Number(row.payableAmount || 0);
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

  async function handleCreateAdvance() {
    if (!advanceForm.teacherId || !advanceForm.amount) {
      toast.error(t("O'qituvchi va summa majburiy"));
      return;
    }
    try {
      await createPayrollAdvance({
        periodMonth: advanceForm.periodMonth,
        teacherId: advanceForm.teacherId,
        amount: Number(advanceForm.amount),
        ...(advanceForm.paidAt ? { paidAt: advanceForm.paidAt } : {}),
        ...(advanceForm.note ? { note: advanceForm.note } : {}),
      }).unwrap();
      toast.success(t("Avans qo'shildi"));
      setAdvanceForm((prev) => ({ ...prev, amount: '', note: '' }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const handleDeleteAdvance = useCallback(async (advanceId) => {
    const ok = window.confirm(t("Avans yozuvini o'chirmoqchimisiz?"));
    if (!ok) return;
    try {
      await deletePayrollAdvance(advanceId).unwrap();
      toast.success(t("Avans o'chirildi"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [deletePayrollAdvance, t]);

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
    if (employeeConfigModal.payrollMode === 'FIXED' && (!Number.isFinite(fixedSalaryAmount) || fixedSalaryAmount <= 0)) {
      toast.error(t('FIXED rejimda oklad summasi musbat bo\'lishi shart'));
      return;
    }

    try {
      await updatePayrollEmployeeConfig({
        employeeId: employeeConfigModal.employeeId,
        payload: {
          payrollMode: employeeConfigModal.payrollMode,
          fixedSalaryAmount,
          isPayrollEligible: Boolean(employeeConfigModal.isPayrollEligible),
          employmentStatus: employeeConfigModal.employmentStatus,
          note: employeeConfigModal.note || '',
        },
      }).unwrap();
      toast.success(t("Payroll konfiguratsiya saqlandi"));
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
      toast.success(t('Payroll reverse qilindi'));
      setReverseReason('');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleExportRunCsv() {
    if (!activeRunId) {
      toast.error(t('Run tanlang'));
      return;
    }
    try {
      const result = await exportPayrollRunCsv({
        runId: activeRunId,
        params: {
          ...(lineOwnerFilter.teacherId ? { teacherId: lineOwnerFilter.teacherId } : {}),
          ...(lineOwnerFilter.employeeId ? { employeeId: lineOwnerFilter.employeeId } : {}),
          ...(lineFilters.type ? { type: lineFilters.type } : {}),
        },
      }).unwrap();
      const fallbackName = `payroll-${selectedRun?.periodMonth || 'run'}.csv`;
      saveDownloadedFile({ blob: result.blob, fileName: result.fileName, fallbackName });
      toast.success(t('CSV yuklab olindi'));
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
            ? t('Dry-run yakunlandi: {{steps}}', { steps: doneSteps })
            : t('Dry-run yakunlandi'),
        );
      } else {
        toast.success(
          doneSteps
            ? t('Auto process yakunlandi: {{steps}}', { steps: doneSteps })
            : t('Auto process yakunlandi'),
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
          t("Auto process to'xtadi. Blockerlar soni: {{count}}", { count: blockerCount }),
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
  const handleOpenMismatchLessons = useCallback((teacherId) => {
    if (isManagerView || !teacherId) return;
    setTab('settings');
    setSettingsTab('lessons');
    setLessonFilters((prev) => ({
      ...prev,
      page: 1,
      periodMonth,
      status: '',
      teacherId,
      subjectId: '',
      classroomId: '',
    }));
  }, [isManagerView, periodMonth]);

  const runItemsColumns = useMemo(
    () => [
      {
        key: 'owner',
        header: t('Xodim'),
        render: (row) => {
          const snapshotName = `${row.teacherFirstNameSnapshot || ''} ${row.teacherLastNameSnapshot || ''}`.trim();
          return formatOwnerName({
            teacher: row.teacher,
            employee: row.employee,
            fallbackName: snapshotName,
            fallbackId: row.teacherId || row.employeeId || '',
          });
        },
      },
      { key: 'paymentStatus', header: t("To'lov holati"), render: (row) => <StatusPill value={row.paymentStatus || 'UNPAID'} /> },
      { key: 'minutes', header: t('Daqiqa'), render: (row) => row.totalMinutes || 0 },
      { key: 'hours', header: t('Soat'), render: (row) => row.totalHours || 0 },
      { key: 'grossAmount', header: t('Brutto'), render: (row) => formatMoney(row.grossAmount) },
      { key: 'fixedSalaryAmount', header: t('Oklad'), render: (row) => formatMoney(row.fixedSalaryAmount) },
      { key: 'advanceDeductionAmount', header: t('Avans ushlanma'), render: (row) => formatMoney(row.advanceDeductionAmount) },
      { key: 'adjustmentAmount', header: t('Adj'), render: (row) => formatMoney(row.adjustmentAmount) },
      { key: 'payableAmount', header: t("To'lanadi"), render: (row) => formatMoney(row.payableAmount) },
      { key: 'paidAmount', header: t("To'langan"), render: (row) => formatMoney(row.paidAmount) },
      {
        key: 'remainingAmount',
        header: t('Qoldiq'),
        render: (row) => formatMoney(Math.max(0, Number(row.payableAmount || 0) - Number(row.paidAmount || 0))),
      },
      {
        key: 'actions',
        header: t('Amallar'),
        render: (row) => {
          const remainingAmount = Math.max(0, Number(row.payableAmount || 0) - Number(row.paidAmount || 0));
          const canPayItem = isAdminView && selectedRun?.status === 'APPROVED' && remainingAmount > 0;
          if (!canPayItem) return '-';
          return (
            <Button size="sm" variant="success" onClick={() => openPayItemModal(row)} disabled={busy}>
              {t("To'lash")}
            </Button>
          );
        },
      },
    ],
    [busy, isAdminView, openPayItemModal, selectedRun?.status, t],
  );

  const runPrimaryAction = (() => {
    if (!selectedRun) return null;

    if ((isAdminView || isManagerView) && selectedRun.status === 'DRAFT') {
      return {
        label: t('Approve'),
        onClick: handleApproveRun,
        disabled: !canApproveSelectedRun || busy,
        variant: 'indigo',
      };
    }

    if (isAdminView && selectedRun.status === 'APPROVED') {
      return {
        label: t("Pay all"),
        onClick: handlePayRun,
        disabled: !canPaySelectedRun || busy,
        variant: 'success',
      };
    }

    if (selectedRun.status === 'PAID') {
      return {
        label: t('CSV yuklab olish'),
        onClick: handleExportRunCsv,
        disabled: busy,
        variant: 'secondary',
      };
    }

    return null;
  })();

  const teacherRatesColumns = useMemo(
    () => [
      {
        key: 'teacher',
        header: t('OР В Р вЂ Р В РІР‚С™Р вЂ™Р’Вqituvchi'),
        render: (row) => (row.teacher ? `${row.teacher.firstName} ${row.teacher.lastName}` : row.teacherId),
      },
      { key: 'subject', header: t('Fan'), render: (row) => row.subject?.name || '-' },
      { key: 'ratePerHour', header: t('Soat narxi'), render: (row) => formatMoney(row.ratePerHour) },
      { key: 'effectiveFrom', header: t('Boshlanish'), render: (row) => toDateInput(row.effectiveFrom) },
      { key: 'effectiveTo', header: t('Tugash'), render: (row) => toDateInput(row.effectiveTo) || '-' },
      {
        key: 'actions',
        header: t('Amallar'),
        render: (row) => (
          isAdminView ? (
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="secondary" onClick={() => openTeacherRateEditModal(row)}>
                {t('Tahrirlash')}
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDeleteTeacherRate(row.id)}>
                {t("O'chirish")}
              </Button>
            </div>
          ) : (
            '-'
          )
        ),
      },
    ],
    [handleDeleteTeacherRate, isAdminView, openTeacherRateEditModal, t],
  );

  const subjectRatesColumns = useMemo(
    () => [
      { key: 'subject', header: t('Fan'), render: (row) => row.subject?.name || '-' },
      { key: 'ratePerHour', header: t('Soat narxi'), render: (row) => formatMoney(row.ratePerHour) },
      { key: 'effectiveFrom', header: t('Boshlanish'), render: (row) => toDateInput(row.effectiveFrom) },
      { key: 'effectiveTo', header: t('Tugash'), render: (row) => toDateInput(row.effectiveTo) || '-' },
      {
        key: 'actions',
        header: t('Amallar'),
        render: (row) => (
          isAdminView ? (
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="secondary" onClick={() => openSubjectRateEditModal(row)}>
                {t('Tahrirlash')}
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDeleteSubjectRate(row.id)}>
                {t("O'chirish")}
              </Button>
            </div>
          ) : (
            '-'
          )
        ),
      },
    ],
    [handleDeleteSubjectRate, isAdminView, openSubjectRateEditModal, t],
  );

  const realLessonsColumns = useMemo(
    () => [
      ...(isAdminView
        ? [{
            key: 'select',
            header: (
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-600"
                checked={allRealLessonsPageSelected}
                aria-label={t('Barchasini tanlash')}
                onChange={(e) => toggleSelectAllRealLessonsOnPage(e.target.checked)}
              />
            ),
            render: (row) => (
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-600"
                checked={selectedRealLessonIds.includes(row.id)}
                aria-label={t('Darsni tanlash')}
                onChange={(e) => toggleRealLessonSelection(row.id, e.target.checked)}
              />
            ),
          }]
        : []),
      { key: 'startAt', header: t('Boshlanish'), render: (row) => formatDateTime(row.startAt) },
      {
        key: 'teacher',
        header: t('OР В Р вЂ Р В РІР‚С™Р вЂ™Р’Вqituvchi'),
        render: (row) =>
          row.teacher ? `${row.teacher.firstName} ${row.teacher.lastName}` : teacherOptionLabel(teacherMap.get(row.teacherId) || row),
      },
      { key: 'subject', header: t('Fan'), render: (row) => row.subject?.name || subjectMap.get(row.subjectId)?.name || '-' },
      {
        key: 'classroom',
        header: t('Sinf'),
        render: (row) => {
          const c = row.classroom || classroomMap.get(row.classroomId);
          return c ? `${c.name} (${c.academicYear})` : '-';
        },
      },
      { key: 'durationMinutes', header: t('Daqiqa'), render: (row) => row.durationMinutes || 0 },
      { key: 'status', header: t('Holat'), render: (row) => <StatusPill value={row.status} /> },
      { key: 'note', header: t('Izoh'), render: (row) => row.note || '-' },
      {
        key: 'actions',
        header: t('Amallar'),
        render: (row) =>
          isAdminView ? (
            <Button size="sm" variant="secondary" onClick={() => openLessonStatusModal(row)}>
              {t('Status')}
            </Button>
          ) : (
            '-'
          ),
      },
    ],
    [
      allRealLessonsPageSelected,
      classroomMap,
      isAdminView,
      openLessonStatusModal,
      selectedRealLessonIds,
      subjectMap,
      t,
      teacherMap,
      teacherOptionLabel,
      toggleRealLessonSelection,
      toggleSelectAllRealLessonsOnPage,
    ],
  );

  const advanceColumns = useMemo(
    () => [
      { key: 'periodMonth', header: t('Oy'), render: (row) => row.periodMonth || '-' },
      {
        key: 'owner',
        header: t('Xodim'),
        render: (row) =>
          formatOwnerName({
            teacher: row.teacher,
            employee: row.employee,
            fallbackId: row.teacherId || row.employeeId || '',
          }),
      },
      { key: 'amount', header: t('Avans summasi'), render: (row) => formatMoney(row.amount) },
      { key: 'paidAt', header: t('Berilgan sana'), render: (row) => formatDateTime(row.paidAt) },
      { key: 'note', header: t('Izoh'), render: (row) => row.note || '-' },
      {
        key: 'actions',
        header: t('Amallar'),
        render: (row) =>
          isAdminView ? (
            <Button size="sm" variant="danger" onClick={() => handleDeleteAdvance(row.id)} disabled={busy}>
              {t("O'chirish")}
            </Button>
          ) : (
            '-'
          ),
      },
    ],
    [busy, handleDeleteAdvance, isAdminView, t],
  );
  const payrollEmployeeColumns = useMemo(
    () => [
      {
        key: 'employee',
        header: t('Xodim'),
        render: (row) => formatEmployeeConfigName(row),
      },
      {
        key: 'kind',
        header: t('Turi'),
        render: (row) => row.kind || '-',
      },
      {
        key: 'payrollMode',
        header: t('Payroll mode'),
        render: (row) => <StatusPill value={row.payrollMode} />,
      },
      {
        key: 'fixedSalaryAmount',
        header: t('Oklad'),
        render: (row) => formatMoney(row.fixedSalaryAmount),
      },
      {
        key: 'isPayrollEligible',
        header: t('Payrollga kiradi'),
        render: (row) => (row.isPayrollEligible ? t('Ha') : t("Yo'q")),
      },
      {
        key: 'employmentStatus',
        header: t('Bandlik'),
        render: (row) => <StatusPill value={row.employmentStatus} />,
      },
      {
        key: 'note',
        header: t('Izoh'),
        render: (row) => row.note || '-',
      },
      {
        key: 'actions',
        header: t('Amallar'),
        render: (row) => (
          isAdminView ? (
            <Button size="sm" variant="secondary" onClick={() => openEmployeeConfigModal(row)} disabled={busy}>
              {t('Tahrirlash')}
            </Button>
          ) : (
            '-'
          )
        ),
      },
    ],
    [busy, isAdminView, openEmployeeConfigModal, t],
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
  const realLessons = payrollRealLessonsQuery.data?.realLessons || [];
  const advances = payrollAdvancesQuery.data?.advances || [];
  const payrollEmployees = payrollEmployeesQuery.data?.employees || [];
  const advancesState = {
    loading: payrollAdvancesQuery.isLoading || payrollAdvancesQuery.isFetching,
    error: payrollAdvancesQuery.error?.message || null,
    page: payrollAdvancesQuery.data?.page || advanceFilters.page,
    pages: payrollAdvancesQuery.data?.pages || 1,
    total: payrollAdvancesQuery.data?.total || 0,
  };
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
  const automationBlockers = automationHealth?.blockers || [];
  const automationWarnings = automationHealth?.warnings || [];
  const monthlyReport = payrollMonthlyReportQuery.data;
  const monthlyReportState = {
    loading: payrollMonthlyReportQuery.isLoading || payrollMonthlyReportQuery.isFetching,
    error: payrollMonthlyReportQuery.error?.message || null,
  };
  const monthlyReportSummary = monthlyReport?.summary || null;
  const teacherWorkloadMismatches = useMemo(() => {
    const metrics = Array.isArray(automationHealth?.teacherMetrics) ? automationHealth.teacherMetrics : [];
    return metrics
      .map((row) => {
        const expectedHours = Number(row.weeklyPlanHours || 0);
        const plannedWeeklyHours = Number(row.plannedWeeklyHours || 0);
        const plannedHours = Number(row.plannedMonthlyHours || 0);
        const actualHours = Number(row.actualMonthlyHours || 0);
        const monthlyDeltaHours = Number(row.monthlyDeltaHours || actualHours - plannedHours);
        const weeklyOverHours = row.hasWorkloadPlan ? Math.max(0, plannedWeeklyHours - expectedHours) : 0;
        const monthlyGapHours = Math.abs(monthlyDeltaHours);
        const hasMismatch = !row.hasWorkloadPlan || weeklyOverHours > 0.05 || monthlyGapHours > 0.05;
        const severity = monthlyGapHours + weeklyOverHours + (row.hasWorkloadPlan ? 0 : 1);
        return {
          teacherId: row.teacherId || '',
          teacherName: row.teacherName || row.teacherId || '-',
          expectedHours,
          plannedHours,
          actualHours,
          monthlyDeltaHours,
          hasMismatch,
          severity,
        };
      })
      .filter((row) => row.hasMismatch)
      .sort((a, b) => {
        const diff = b.severity - a.severity;
        if (diff !== 0) return diff;
        return String(a.teacherName).localeCompare(String(b.teacherName));
      })
      .slice(0, 12);
  }, [automationHealth]);

  const payrollTabs = isManagerView
    ? [{ value: 'runs', label: t('Payroll Runs') }]
    : [
        { value: 'runs', label: t('Oyliklar') },
        { value: 'settings', label: t('Sozlamalar') },
      ];
  const settingsTabs = [
    { value: 'config', label: t('Payroll Config') },
    { value: 'rates', label: t('Rate sozlamalari') },
    { value: 'lessons', label: t('Real Lessons') },
    { value: 'advances', label: t('Avanslar') },
  ];

  return (
    <AutoTranslate>
      <div className="space-y-4">
        <Card
          title={t("O'qituvchi Oyligi (Payroll)")}
          subtitle={
            isManagerView
              ? t("Menejer uchun review/approve rejimi. Generate, rate, real lesson va pay/reverse amallari yopiq.")
              : t("Minimal oqim: oy tanlash, run ko'rish, approve va to'lash.")
          }
        >
          <Tabs
            value={tab}
            onChange={setTab}
            items={payrollTabs}
          />
        </Card>

        {tab === 'runs' && (
          <>
            <Card
              title={t('Joriy Oylik')}
              subtitle={t("Faqat asosiy oqim: generate, ko'rish, approve va to'lash")}
              actions={(
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Input
                    type="month"
                    value={periodMonth}
                    onChange={(e) => {
                      const nextMonth = e.target.value;
                      setPeriodMonth(nextMonth);
                      setRunFilters((prev) => ({ ...prev, periodMonth: nextMonth, page: 1 }));
                    }}
                  />
                  {runs.length > 1 ? (
                    <Select value={activeRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
                      {runs.map((run) => (
                        <option key={run.id} value={run.id}>
                          {run.periodMonth} | {run.status}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <div className="flex items-center rounded-xl border border-slate-200 px-3 text-sm text-slate-600">
                      {selectedRun ? selectedRun.status : t("Run yo'q")}
                    </div>
                  )}
                  <Button variant="secondary" onClick={handleRefreshRunsDashboard} disabled={runsState.loading || busy}>
                    {t('Yangilash')}
                  </Button>
                  {isAdminView && (
                    <Button variant="indigo" onClick={handleGenerateRun} disabled={busy || !periodMonth}>
                      {selectedRun ? t('Regenerate') : t('Generate')}
                    </Button>
                  )}
                </div>
              )}
            >
              {runsState.loading || runDetailLoading ? <StateView type="skeleton" /> : null}
              {runsState.error ? <StateView type="error" description={runsState.error} /> : null}
              {runDetailError ? <StateView type="error" description={runDetailError} /> : null}
              {!runsState.error && !runDetailError && (
                <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <StatWidget
                      label={t('Automation holati')}
                      value={automationHealth?.summary?.readyForGenerate ? t('Tayyor') : t('Tekshirish kerak')}
                      tone={automationHealth?.summary?.readyForGenerate ? 'emerald' : 'amber'}
                      subtitle={t('Blocker: {{blockers}} | Warning: {{warnings}}', {
                        blockers: automationHealth?.summary?.blockerCount || 0,
                        warnings: automationHealth?.summary?.warningCount || 0,
                      })}
                    />
                    <StatWidget
                      label={t("Report: To'lanadi")}
                      value={formatMoney(monthlyReportSummary?.payableAmount || 0)}
                      tone="indigo"
                      subtitle={t('Oy: {{month}}', { month: periodMonth })}
                    />
                    <StatWidget
                      label={t("Report: Qoldiq")}
                      value={formatMoney(monthlyReportSummary?.remainingAmount || 0)}
                      tone={Number(monthlyReportSummary?.remainingAmount || 0) > 0 ? 'amber' : 'slate'}
                      subtitle={t("To'lovlar soni: {{count}}", { count: monthlyReportSummary?.paymentCount || 0 })}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 xl:col-span-2">
                      {(automationHealthState.loading || monthlyReportState.loading) ? (
                        <StateView type="skeleton" />
                      ) : null}
                      {automationHealthState.error ? <StateView type="error" description={automationHealthState.error} /> : null}
                      {monthlyReportState.error ? <StateView type="error" description={monthlyReportState.error} /> : null}
                      {!automationHealthState.loading && !monthlyReportState.loading && !automationHealthState.error && !monthlyReportState.error && (
                        <>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {t('Health Issues')}
                              </div>
                              {!automationBlockers.length && !automationWarnings.length ? (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                  {t("Blocker yo'q, tizim avtomat hisoblashga tayyor")}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {automationBlockers.slice(0, 3).map((issue) => (
                                    <div key={`blocker-${issue.code}`} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                      <span className="font-semibold">{issue.code}</span> ({issue.count || 0})
                                    </div>
                                  ))}
                                  {automationWarnings.slice(0, 3).map((issue) => (
                                    <div key={`warning-${issue.code}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                      <span className="font-semibold">{issue.code}</span> ({issue.count || 0})
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {t("To'lov usuli kesimi")}
                              </div>
                              {(monthlyReport?.paymentMethodBreakdown || []).length ? (
                                <div className="space-y-2">
                                  {(monthlyReport?.paymentMethodBreakdown || []).slice(0, 4).map((row) => (
                                    <div key={`method-${row.paymentMethod}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                      <span className="text-slate-600">{row.paymentMethod}</span>
                                      <span className="font-semibold text-slate-900">{formatMoney(row.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                  {t("To'lov ma'lumoti yo'q")}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">
                              {t("O'qituvchi yuklama nomuvofiqligi")}
                            </div>
                            {teacherWorkloadMismatches.length ? (
                              <div className="rounded-xl border border-rose-300 bg-rose-50/70 p-3">
                                <div className="mb-2 text-sm text-rose-700">
                                  {t("Jadval/realda farq bor o'qituvchilar: {{count}}", {
                                    count: teacherWorkloadMismatches.length,
                                  })}
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-rose-200 text-left text-xs uppercase tracking-wide text-rose-800">
                                        <th className="px-2 py-2">{t("O'qituvchi")}</th>
                                        <th className="px-2 py-2">{t('Kutilgan (hafta)')}</th>
                                        <th className="px-2 py-2">{t('Reja (oy)')}</th>
                                        <th className="px-2 py-2">{t('Amalda (oy)')}</th>
                                        <th className="px-2 py-2">{t('Farq (oy)')}</th>
                                        <th className="px-2 py-2">{t('Amal')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {teacherWorkloadMismatches.map((row) => (
                                        <tr key={`mismatch-${row.teacherId || row.teacherName}`} className="border-b border-rose-100 text-rose-900">
                                          <td className="px-2 py-2 font-medium">{row.teacherName}</td>
                                          <td className="px-2 py-2">{formatHours(row.expectedHours)}</td>
                                          <td className="px-2 py-2">{formatHours(row.plannedHours)}</td>
                                          <td className="px-2 py-2">{formatHours(row.actualHours)}</td>
                                          <td className="px-2 py-2 font-semibold">
                                            {row.monthlyDeltaHours > 0 ? '+' : ''}
                                            {formatHours(row.monthlyDeltaHours)}
                                          </td>
                                          <td className="px-2 py-2">
                                            {isManagerView ? (
                                              <span className="text-xs text-rose-600">{t('Faqat admin')}</span>
                                            ) : (
                                              <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleOpenMismatchLessons(row.teacherId)}
                                                disabled={!row.teacherId || busy}
                                              >
                                                {t("Darslarni ochish")}
                                              </Button>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                {t("Workload mismatch topilmadi")}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {t('Line Type kesimi')}
                            </div>
                            {(monthlyReport?.lineTypeBreakdown || []).length ? (
                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                {(monthlyReport?.lineTypeBreakdown || []).slice(0, 6).map((row) => (
                                  <div key={`line-${row.type}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                    <span className="text-slate-600">{row.type}</span>
                                    <span className="font-semibold text-slate-900">{formatMoney(row.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                {t("Line type bo'yicha ma'lumot yo'q")}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Automation')}</div>
                      {isAdminView ? (
                        <>
                          <Field label={t('Rejim')}>
                            <Select
                              value={automationForm.mode}
                              onChange={(e) => setAutomationForm((prev) => ({ ...prev, mode: e.target.value }))}
                              disabled={busy}
                            >
                              <option value="GENERATE_ONLY">{t('Generate only')}</option>
                              <option value="GENERATE_APPROVE">{t('Generate + Approve')}</option>
                              <option value="FULL_PAY">{t('Generate + Approve + Pay')}</option>
                            </Select>
                          </Field>
                          {automationForm.mode === 'FULL_PAY' && (
                            <Field label={t("To'lov usuli")}>
                              <Select
                                value={automationForm.paymentMethod}
                                onChange={(e) => setAutomationForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                                disabled={busy}
                              >
                                <option value="BANK">BANK</option>
                                <option value="CASH">CASH</option>
                                <option value="CLICK">CLICK</option>
                                <option value="PAYME">PAYME</option>
                              </Select>
                            </Field>
                          )}
                          <Field label={t('Force')}>
                            <Select
                              value={automationForm.force ? 'true' : 'false'}
                              onChange={(e) => setAutomationForm((prev) => ({ ...prev, force: e.target.value === 'true' }))}
                              disabled={busy}
                            >
                              <option value="false">{t("Yo'q")}</option>
                              <option value="true">{t('Ha')}</option>
                            </Select>
                          </Field>
                          <div className="grid grid-cols-1 gap-2">
                            <Button variant="secondary" onClick={() => handleRunAutomation({ dryRun: true })} disabled={busy}>
                              {t('Dry Run')}
                            </Button>
                            <Button variant="indigo" onClick={() => handleRunAutomation({ dryRun: false })} disabled={busy}>
                              {t('Auto Process')}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          {t("Menejer bu blokda faqat holatni kuzatadi")}
                        </div>
                      )}
                      <Button variant="secondary" onClick={handleRefreshRunsDashboard} disabled={busy}>
                        {t('Health/Report yangilash')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {!runsState.loading && !runsState.error && !selectedRun && (
                <StateView
                  type="empty"
                  description={t("Tanlangan oy uchun run topilmadi. Avval Generate bosing.")}
                />
              )}

              {selectedRun && !runDetailLoading && !runDetailError && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <StatWidget
                      label={t("To'lanadi")}
                      value={formatMoney(selectedRunPayableAmount)}
                      tone="indigo"
                      subtitle={`${selectedRun.periodMonth} | ${selectedRun.status}`}
                    />
                    <StatWidget
                      label={t("To'langan")}
                      value={formatMoney(selectedRunPaidAmount)}
                      tone="emerald"
                      subtitle={t("Xodimlar bo'yicha to'lov yig'indisi")}
                    />
                    <StatWidget
                      label={t('Qoldiq')}
                      value={formatMoney(selectedRunRemainingAmount)}
                      tone={selectedRunRemainingAmount > 0 ? 'amber' : 'slate'}
                      subtitle={t("To'lanishi kerak qolgan summa")}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <Card title={t('Xodimlar kesimida')} className="xl:col-span-2">
                      <DataTable
                        columns={runItemsColumns}
                        rows={selectedRun.items || []}
                        density="compact"
                        maxHeightClassName="max-h-[360px]"
                      />
                    </Card>

                    <Card title={t('Asosiy amal')} className="xl:col-span-1">
                      <div className="space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                          <div className="flex items-center justify-between">
                            <span>{t('Run holati')}</span>
                            <StatusPill value={selectedRun.status} />
                          </div>
                          <div className="mt-2">{t('Xodimlar')}: {selectedRun.teacherCount || 0}</div>
                        </div>

                        {isAdminView && selectedRun.status === 'APPROVED' && (
                          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                            <Field label={t("To'lov usuli")}>
                              <Select
                                value={payForm.paymentMethod}
                                onChange={(e) => setPayForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                                disabled={!canPaySelectedRun || busy}
                              >
                                <option value="BANK">BANK</option>
                                <option value="CASH">CASH</option>
                                <option value="CLICK">CLICK</option>
                                <option value="PAYME">PAYME</option>
                              </Select>
                            </Field>
                          </div>
                        )}

                        {runPrimaryAction ? (
                          <Button
                            className="w-full"
                            variant={runPrimaryAction.variant}
                            onClick={runPrimaryAction.onClick}
                            disabled={runPrimaryAction.disabled}
                          >
                            {runPrimaryAction.label}
                          </Button>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            {t("Bu holatda asosiy amal mavjud emas")}
                          </div>
                        )}

                        {!isManagerView && canReverseSelectedRun && (
                          <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/40 p-3">
                            <Field label={t('Reverse sababi')}>
                              <Textarea
                                rows={2}
                                value={reverseReason}
                                onChange={(e) => setReverseReason(e.target.value)}
                                disabled={!canReverseSelectedRun || busy}
                              />
                            </Field>
                            <Button
                              className="w-full"
                              variant="danger"
                              disabled={!canReverseSelectedRun || !reverseReason.trim() || busy}
                              onClick={handleReverseRun}
                            >
                              {t('Reverse')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}

        {!isManagerView && tab === 'settings' && (
          <Card
            title={t('Sozlamalar')}
            subtitle={t("Kam ishlatiladigan bo'limlar shu yerga yig'ilgan")}
          >
            <Tabs value={settingsTab} onChange={setSettingsTab} items={settingsTabs} />
          </Card>
        )}

        {!isManagerView && tab === 'settings' && settingsTab === 'config' && (
          <Card
            title={t('Payroll Config')}
            subtitle={t("Xodimlar uchun payroll mode, oklad va eligibility sozlamalarini boshqaring.")}
            actions={(
              <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
                <Input
                  value={employeeConfigFilters.search}
                  onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                  placeholder={t('Qidirish')}
                />
                <Select
                  value={employeeConfigFilters.kind}
                  onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, kind: e.target.value, page: 1 }))}
                >
                  <option value="">{t('Barcha tur')}</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="STAFF">STAFF</option>
                </Select>
                <Select
                  value={employeeConfigFilters.payrollMode}
                  onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, payrollMode: e.target.value, page: 1 }))}
                >
                  <option value="">{t('Barcha mode')}</option>
                  <option value="LESSON_BASED">LESSON_BASED</option>
                  <option value="FIXED">FIXED</option>
                  <option value="MIXED">MIXED</option>
                  <option value="MANUAL_ONLY">MANUAL_ONLY</option>
                </Select>
                <Select
                  value={employeeConfigFilters.employmentStatus}
                  onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, employmentStatus: e.target.value, page: 1 }))}
                >
                  <option value="">{t('Barcha bandlik')}</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </Select>
                <Select
                  value={employeeConfigFilters.isPayrollEligible}
                  onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, isPayrollEligible: e.target.value, page: 1 }))}
                >
                  <option value="">{t('Eligibility (hammasi)')}</option>
                  <option value="true">{t('Faqat kiradi')}</option>
                  <option value="false">{t("Faqat kirmaydi")}</option>
                </Select>
                <Select
                  value={String(employeeConfigFilters.limit)}
                  onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                >
                  {[10, 20, 50].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </Select>
                <Button variant="secondary" onClick={() => payrollEmployeesQuery.refetch()} disabled={payrollEmployeesState.loading}>
                  {t('Yangilash')}
                </Button>
              </div>
            )}
          >
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {t("FIXED rejimda oklad summasi musbat bo'lishi shart. MIXED rejimda dars + oklad birga hisoblanadi.")}
            </div>
            {payrollEmployeesState.loading ? (
              <StateView type="skeleton" />
            ) : payrollEmployeesState.error ? (
              <StateView type="error" description={payrollEmployeesState.error} />
            ) : (
              <>
                <DataTable
                  columns={payrollEmployeeColumns}
                  rows={payrollEmployees}
                  density="compact"
                  maxHeightClassName="max-h-[500px]"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                  <div>{t('Jami')}: {payrollEmployeesState.total}</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={payrollEmployeesState.page <= 1}
                      onClick={() =>
                        setEmployeeConfigFilters((prev) => ({ ...prev, page: Math.max(1, payrollEmployeesState.page - 1) }))
                      }
                    >
                      {t('Oldingi')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={payrollEmployeesState.page >= payrollEmployeesState.pages}
                      onClick={() =>
                        setEmployeeConfigFilters((prev) => ({ ...prev, page: Math.min(payrollEmployeesState.pages, payrollEmployeesState.page + 1) }))
                      }
                    >
                      {t('Keyingi')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        )}

        {!isManagerView && tab === 'settings' && settingsTab === 'rates' && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card
              title={t('Teacher Override Rate')}
              subtitle={t("Teacherga fan kesimida alohida narx berish uchun drawer orqali yangi rate qo'shing.")}
              actions={(
                <Button size="sm" variant="indigo" onClick={() => openRateCreateDrawer('teacher')} disabled={busy}>
                  {t("Yangi teacher rate")}
                </Button>
              )}
            >
              <div className="hidden grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label={t('OР В Р вЂ Р В РІР‚С™Р вЂ™Р’Вqituvchi')}>
                  <Combobox
                    value={teacherRateForm.teacherId}
                    onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                    placeholder={t('Tanlang')}
                    noOptionsText={t("O'qituvchi topilmadi")}
                    options={teacherComboboxOptions}
                  />
                </Field>
                <Field label={t('Fan')}>
                  <Select value={teacherRateForm.subjectId} onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, subjectId: e.target.value }))}>
                    <option value="">{t('Tanlang')}</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('Soat narxi')}>
                  <MoneyInputUz value={teacherRateForm.ratePerHour} onValueChange={(raw) => setTeacherRateForm((prev) => ({ ...prev, ratePerHour: raw }))} />
                </Field>
                <Field label={t('effectiveFrom')}>
                  <Input type="date" value={teacherRateForm.effectiveFrom} onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))} />
                </Field>
                <Field label={t('effectiveTo')}>
                  <Input type="date" value={teacherRateForm.effectiveTo} onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, effectiveTo: e.target.value }))} />
                </Field>
                <Field label={t('Izoh')}>
                  <Input value={teacherRateForm.note} onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, note: e.target.value }))} />
                </Field>
              </div>
              <div className="mt-3 hidden justify-end">
                <Button
                  variant="indigo"
                  disabled={!teacherRateForm.teacherId || !teacherRateForm.subjectId || !teacherRateForm.ratePerHour || !teacherRateForm.effectiveFrom || busy}
                  onClick={handleCreateTeacherRate}
                >
                  {t("Teacher rate qo'shish")}
                </Button>
              </div>
              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {t("Override rate subject default rate'dan ustun keladi.")}
              </div>
              <div className="mt-4">
                {payrollTeacherRatesQuery.isLoading ? (
                  <StateView type="skeleton" />
                ) : payrollTeacherRatesQuery.error ? (
                  <StateView type="error" description={payrollTeacherRatesQuery.error?.message} />
                ) : (
                  <DataTable columns={teacherRatesColumns} rows={teacherRates} density="compact" maxHeightClassName="max-h-[380px]" />
                )}
              </div>
            </Card>

            <Card
              title={t('Subject Default Rate')}
              subtitle={t("Fan bo'yicha umumiy soat narxlarini drawer ichida boshqaring.")}
              actions={(
                <Button size="sm" variant="indigo" onClick={() => openRateCreateDrawer('subject')} disabled={busy}>
                  {t("Yangi subject rate")}
                </Button>
              )}
            >
              <div className="hidden grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label={t('Fan')}>
                  <Select value={subjectRateForm.subjectId} onChange={(e) => setSubjectRateForm((prev) => ({ ...prev, subjectId: e.target.value }))}>
                    <option value="">{t('Tanlang')}</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('Soat narxi')}>
                  <MoneyInputUz value={subjectRateForm.ratePerHour} onValueChange={(raw) => setSubjectRateForm((prev) => ({ ...prev, ratePerHour: raw }))} />
                </Field>
                <Field label={t('effectiveFrom')}>
                  <Input type="date" value={subjectRateForm.effectiveFrom} onChange={(e) => setSubjectRateForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))} />
                </Field>
                <Field label={t('effectiveTo')}>
                  <Input type="date" value={subjectRateForm.effectiveTo} onChange={(e) => setSubjectRateForm((prev) => ({ ...prev, effectiveTo: e.target.value }))} />
                </Field>
                <Field label={t('Izoh')}>
                  <Input value={subjectRateForm.note} onChange={(e) => setSubjectRateForm((prev) => ({ ...prev, note: e.target.value }))} />
                </Field>
              </div>
              <div className="mt-3 hidden justify-end">
                <Button
                  variant="indigo"
                  disabled={!subjectRateForm.subjectId || !subjectRateForm.ratePerHour || !subjectRateForm.effectiveFrom || busy}
                  onClick={handleCreateSubjectRate}
                >
                  {t("Subject rate qo'shish")}
                </Button>
              </div>
              <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {t("Teacher override bo'lmasa payroll shu default rate'dan foydalanadi.")}
              </div>
              <div className="mt-4">
                {payrollSubjectRatesQuery.isLoading ? (
                  <StateView type="skeleton" />
                ) : payrollSubjectRatesQuery.error ? (
                  <StateView type="error" description={payrollSubjectRatesQuery.error?.message} />
                ) : (
                  <DataTable columns={subjectRatesColumns} rows={subjectRates} density="compact" maxHeightClassName="max-h-[380px]" />
                )}
              </div>
            </Card>
          </div>
        )}

        {!isManagerView && tab === 'settings' && settingsTab === 'lessons' && (
          <>
            <Card title={t('Real Lesson qoР В Р вЂ Р В РІР‚С™Р вЂ™Р’Вshish')}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label={t('OР В Р вЂ Р В РІР‚С™Р вЂ™Р’Вqituvchi')}>
                  <Combobox
                    value={realLessonForm.teacherId}
                    onChange={(e) => setRealLessonForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                    placeholder={t('Tanlang')}
                    noOptionsText={t("O'qituvchi topilmadi")}
                    options={teacherComboboxOptions}
                  />
                </Field>
                <Field label={t('Fan')}>
                  <Select value={realLessonForm.subjectId} onChange={(e) => setRealLessonForm((prev) => ({ ...prev, subjectId: e.target.value }))}>
                    <option value="">{t('Tanlang')}</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('Sinf')}>
                  <Select value={realLessonForm.classroomId} onChange={(e) => setRealLessonForm((prev) => ({ ...prev, classroomId: e.target.value }))}>
                    <option value="">{t('Tanlang')}</option>
                    {classrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>{classroom.name} ({classroom.academicYear})</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('Status')}>
                  <Select value={realLessonForm.status} onChange={(e) => setRealLessonForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="DONE">DONE</option>
                    <option value="CANCELED">CANCELED</option>
                    <option value="REPLACED">REPLACED</option>
                  </Select>
                </Field>
                <Field label={t('Boshlanish')}>
                  <Input type="datetime-local" value={realLessonForm.startAt} onChange={(e) => setRealLessonForm((prev) => ({ ...prev, startAt: e.target.value }))} />
                </Field>
                <Field label={t('Tugash')}>
                  <Input type="datetime-local" value={realLessonForm.endAt} onChange={(e) => setRealLessonForm((prev) => ({ ...prev, endAt: e.target.value }))} />
                </Field>
                <Field label={t('Daqiqa (ixtiyoriy)')}>
                  <Input type="number" value={realLessonForm.durationMinutes} onChange={(e) => setRealLessonForm((prev) => ({ ...prev, durationMinutes: e.target.value }))} />
                </Field>
                <Field label={t('Replacement teacher')}>
                  <Combobox
                    value={realLessonForm.replacedByTeacherId}
                    onChange={(e) => setRealLessonForm((prev) => ({ ...prev, replacedByTeacherId: e.target.value }))}
                    disabled={realLessonForm.status !== 'REPLACED'}
                    placeholder={t('Tanlang')}
                    noOptionsText={t("O'qituvchi topilmadi")}
                    options={teacherComboboxOptions}
                  />
                </Field>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                <Textarea
                  rows={2}
                  value={realLessonForm.note}
                  onChange={(e) => setRealLessonForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder={t('Izoh')}
                />
                <Button
                  variant="indigo"
                  disabled={!realLessonForm.teacherId || !realLessonForm.subjectId || !realLessonForm.classroomId || !realLessonForm.startAt || !realLessonForm.endAt || (realLessonForm.status === 'REPLACED' && !realLessonForm.replacedByTeacherId) || busy}
                  onClick={handleCreateRealLesson}
                >
                  {t("Real lesson qo'shish")}
                </Button>
              </div>
            </Card>

            <Card
              title={t("Real Lessons ro'yxati")}
              actions={(
                <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                  <Input type="month" value={lessonFilters.periodMonth} onChange={(e) => setLessonFilters((prev) => ({ ...prev, periodMonth: e.target.value, page: 1 }))} />
                  <Select value={lessonFilters.status} onChange={(e) => setLessonFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}>
                    <option value="">{t('Barcha status')}</option>
                    <option value="DONE">DONE</option>
                    <option value="CANCELED">CANCELED</option>
                    <option value="REPLACED">REPLACED</option>
                  </Select>
                  <Combobox
                    value={lessonFilters.teacherId}
                    onChange={(e) => setLessonFilters((prev) => ({ ...prev, teacherId: e.target.value, page: 1 }))}
                    placeholder={t('Barcha teacher')}
                    noOptionsText={t("O'qituvchi topilmadi")}
                    options={teacherComboboxOptions}
                  />
                  <Select value={lessonFilters.subjectId} onChange={(e) => setLessonFilters((prev) => ({ ...prev, subjectId: e.target.value, page: 1 }))}>
                    <option value="">{t('Barcha fan')}</option>
                    {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                  </Select>
                  <Select value={lessonFilters.classroomId} onChange={(e) => setLessonFilters((prev) => ({ ...prev, classroomId: e.target.value, page: 1 }))}>
                    <option value="">{t('Barcha sinf')}</option>
                    {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
                  </Select>
                  <Button variant="secondary" onClick={() => payrollRealLessonsQuery.refetch()}>
                    {t('Yangilash')}
                  </Button>
                </div>
              )}
            >
              {isAdminView && (
                <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-slate-700">
                      {t('Tanlangan darslar')}: <span className="font-semibold text-slate-900">{selectedRealLessonIdsOnPage.length}</span>
                      {someRealLessonsPageSelected ? (
                        <span className="ml-2 text-xs text-slate-500">{t("(joriy sahifadan qisman)")}</span>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!selectedRealLessonIdsOnPage.length || busy}
                        onClick={() => setSelectedRealLessonIds([])}
                      >
                        {t('Tanlovni tozalash')}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                    <Select
                      value={bulkLessonStatusForm.status}
                      onChange={(e) =>
                        setBulkLessonStatusForm((prev) => ({
                          ...prev,
                          status: e.target.value,
                          replacedByTeacherId: e.target.value === 'REPLACED' ? prev.replacedByTeacherId : '',
                        }))
                      }
                      disabled={busy}
                    >
                      <option value="DONE">DONE</option>
                      <option value="CANCELED">CANCELED</option>
                      <option value="REPLACED">REPLACED</option>
                    </Select>
                    <Combobox
                      value={bulkLessonStatusForm.replacedByTeacherId}
                      onChange={(e) => setBulkLessonStatusForm((prev) => ({ ...prev, replacedByTeacherId: e.target.value }))}
                      disabled={busy || bulkLessonStatusForm.status !== 'REPLACED'}
                      placeholder={t('Replacement teacher')}
                      noOptionsText={t("O'qituvchi topilmadi")}
                      options={teacherComboboxOptions}
                    />
                    <Input
                      value={bulkLessonStatusForm.note}
                      onChange={(e) => setBulkLessonStatusForm((prev) => ({ ...prev, note: e.target.value }))}
                      placeholder={t('Izoh (ixtiyoriy)')}
                      disabled={busy}
                    />
                    <Button
                      variant="indigo"
                      disabled={
                        busy ||
                        !selectedRealLessonIdsOnPage.length ||
                        (bulkLessonStatusForm.status === 'REPLACED' && !bulkLessonStatusForm.replacedByTeacherId)
                      }
                      onClick={handleBulkLessonStatusUpdate}
                    >
                      {t('Bulk status qoР В Р вЂ Р В РІР‚С™Р вЂ™Р’Вllash')}
                    </Button>
                  </div>
                </div>
              )}
              {payrollRealLessonsQuery.isLoading || payrollRealLessonsQuery.isFetching ? (
                <StateView type="skeleton" />
              ) : payrollRealLessonsQuery.error ? (
                <StateView type="error" description={payrollRealLessonsQuery.error?.message} />
              ) : (
                <>
                  <DataTable columns={realLessonsColumns} rows={realLessons} density="compact" maxHeightClassName="max-h-[420px]" />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                    <div>{t('Jami')}: {payrollRealLessonsQuery.data?.total || 0}</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={(payrollRealLessonsQuery.data?.page || 1) <= 1}
                        onClick={() => setLessonFilters((prev) => ({ ...prev, page: Math.max(1, (payrollRealLessonsQuery.data?.page || 1) - 1) }))}
                      >
                        {t('Oldingi')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={(payrollRealLessonsQuery.data?.page || 1) >= (payrollRealLessonsQuery.data?.pages || 1)}
                        onClick={() => setLessonFilters((prev) => ({ ...prev, page: Math.min((payrollRealLessonsQuery.data?.pages || 1), (payrollRealLessonsQuery.data?.page || 1) + 1) }))}
                      >
                        {t('Keyingi')}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </>
        )}

        {!isManagerView && tab === 'settings' && settingsTab === 'advances' && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card
              title={t("Avans qo'shish")}
              subtitle={t("Oy davomida berilgan avansni kiriting. Generate vaqtida bu summa ushlanadi.")}
              className="xl:col-span-1"
            >
              <div className="space-y-3">
                <Field label={t('Oy')}>
                  <Input
                    type="month"
                    value={advanceForm.periodMonth}
                    onChange={(e) => setAdvanceForm((prev) => ({ ...prev, periodMonth: e.target.value }))}
                    disabled={busy}
                  />
                </Field>
                <Field label={t("O'qituvchi")}>
                  <Combobox
                    value={advanceForm.teacherId}
                    onChange={(e) => setAdvanceForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                    placeholder={t('Tanlang')}
                    noOptionsText={t("O'qituvchi topilmadi")}
                    options={teacherComboboxOptions}
                    disabled={busy}
                  />
                </Field>
                <Field label={t('Avans summasi')}>
                  <MoneyInputUz
                    value={advanceForm.amount}
                    onValueChange={(raw) => setAdvanceForm((prev) => ({ ...prev, amount: raw }))}
                    disabled={busy}
                  />
                </Field>
                <Field label={t('Berilgan sana (ixtiyoriy)')}>
                  <Input
                    type="datetime-local"
                    value={advanceForm.paidAt}
                    onChange={(e) => setAdvanceForm((prev) => ({ ...prev, paidAt: e.target.value }))}
                    disabled={busy}
                  />
                </Field>
                <Field label={t('Izoh')}>
                  <Textarea
                    rows={3}
                    value={advanceForm.note}
                    onChange={(e) => setAdvanceForm((prev) => ({ ...prev, note: e.target.value }))}
                    disabled={busy}
                  />
                </Field>
                <Button
                  className="w-full"
                  variant="indigo"
                  onClick={handleCreateAdvance}
                  disabled={!advanceForm.periodMonth || !advanceForm.teacherId || !advanceForm.amount || busy}
                >
                  {t("Avans qo'shish")}
                </Button>
              </div>
            </Card>

            <Card
              title={t("Avanslar ro'yxati")}
              className="xl:col-span-2"
              actions={(
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Input
                    type="month"
                    value={advanceFilters.periodMonth}
                    onChange={(e) => setAdvanceFilters((prev) => ({ ...prev, periodMonth: e.target.value, page: 1 }))}
                  />
                  <Select
                    value={String(advanceFilters.limit)}
                    onChange={(e) => setAdvanceFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                  >
                    {[10, 20, 50].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </Select>
                  <Button variant="secondary" onClick={() => payrollAdvancesQuery.refetch()} disabled={advancesState.loading}>
                    {t('Yangilash')}
                  </Button>
                </div>
              )}
            >
              {advancesState.loading ? (
                <StateView type="skeleton" />
              ) : advancesState.error ? (
                <StateView type="error" description={advancesState.error} />
              ) : (
                <>
                  <DataTable columns={advanceColumns} rows={advances} density="compact" maxHeightClassName="max-h-[460px]" />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                    <div>{t('Jami')}: {advancesState.total}</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={advancesState.page <= 1}
                        onClick={() => setAdvanceFilters((prev) => ({ ...prev, page: Math.max(1, advancesState.page - 1) }))}
                      >
                        {t('Oldingi')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={advancesState.page >= advancesState.pages}
                        onClick={() => setAdvanceFilters((prev) => ({ ...prev, page: Math.min(advancesState.pages, advancesState.page + 1) }))}
                      >
                        {t('Keyingi')}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        )}

        <Drawer
          open={rateCreateDrawer.open}
          onClose={closeRateCreateDrawer}
          title={rateCreateDrawer.kind === 'teacher' ? t('Yangi Teacher Override Rate') : t('Yangi Subject Default Rate')}
          subtitle={rateCreateDrawer.kind === 'teacher'
            ? t("Teacher + fan bo'yicha override rate yarating")
            : t("Fan bo'yicha umumiy default rate yarating")}
          widthClassName="max-w-2xl"
        >
          <div className="space-y-4">
            {rateCreateDrawer.kind === 'teacher' ? (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label={t("O'qituvchi")}>
                    <Combobox
                      value={teacherRateForm.teacherId}
                      onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                      placeholder={t('Tanlang')}
                      noOptionsText={t("O'qituvchi topilmadi")}
                      options={teacherComboboxOptions}
                      disabled={busy}
                    />
                  </Field>
                  <Field label={t('Fan')}>
                    <Select
                      value={teacherRateForm.subjectId}
                      onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, subjectId: e.target.value }))}
                      disabled={busy}
                    >
                      <option value="">{t('Tanlang')}</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t('Soat narxi')}>
                    <MoneyInputUz
                      value={teacherRateForm.ratePerHour}
                      onValueChange={(raw) => setTeacherRateForm((prev) => ({ ...prev, ratePerHour: raw }))}
                      disabled={busy}
                    />
                  </Field>
                  <Field label={t('effectiveFrom')}>
                    <Input
                      type="date"
                      value={teacherRateForm.effectiveFrom}
                      onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
                      disabled={busy}
                    />
                  </Field>
                  <Field label={t('effectiveTo')}>
                    <Input
                      type="date"
                      value={teacherRateForm.effectiveTo}
                      onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, effectiveTo: e.target.value }))}
                      disabled={busy}
                    />
                  </Field>
                  <Field label={t('Izoh')}>
                    <Input
                      value={teacherRateForm.note}
                      onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, note: e.target.value }))}
                      disabled={busy}
                    />
                  </Field>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={closeRateCreateDrawer} disabled={busy}>
                    {t('Bekor qilish')}
                  </Button>
                  <Button
                    variant="indigo"
                    disabled={!teacherRateForm.teacherId || !teacherRateForm.subjectId || !teacherRateForm.ratePerHour || !teacherRateForm.effectiveFrom || busy}
                    onClick={handleCreateTeacherRate}
                  >
                    {t("Teacher rate qo'shish")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label={t('Fan')}>
                    <Select
                      value={subjectRateForm.subjectId}
                      onChange={(e) => setSubjectRateForm((prev) => ({ ...prev, subjectId: e.target.value }))}
                      disabled={busy}
                    >
                      <option value="">{t('Tanlang')}</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t('Soat narxi')}>
                    <MoneyInputUz
                      value={subjectRateForm.ratePerHour}
                      onValueChange={(raw) => setSubjectRateForm((prev) => ({ ...prev, ratePerHour: raw }))}
                      disabled={busy}
                    />
                  </Field>
                  <Field label={t('effectiveFrom')}>
                    <Input
                      type="date"
                      value={subjectRateForm.effectiveFrom}
                      onChange={(e) => setSubjectRateForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
                      disabled={busy}
                    />
                  </Field>
                  <Field label={t('effectiveTo')}>
                    <Input
                      type="date"
                      value={subjectRateForm.effectiveTo}
                      onChange={(e) => setSubjectRateForm((prev) => ({ ...prev, effectiveTo: e.target.value }))}
                      disabled={busy}
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label={t('Izoh')}>
                      <Input
                        value={subjectRateForm.note}
                        onChange={(e) => setSubjectRateForm((prev) => ({ ...prev, note: e.target.value }))}
                        disabled={busy}
                      />
                    </Field>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={closeRateCreateDrawer} disabled={busy}>
                    {t('Bekor qilish')}
                  </Button>
                  <Button
                    variant="indigo"
                    disabled={!subjectRateForm.subjectId || !subjectRateForm.ratePerHour || !subjectRateForm.effectiveFrom || busy}
                    onClick={handleCreateSubjectRate}
                  >
                    {t("Subject rate qo'shish")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Drawer>

        <Drawer
          open={adjustmentDrawerOpen}
          onClose={() => setAdjustmentDrawerOpen(false)}
          title={t('Manual Adjustment')}
          subtitle={selectedRun?.periodLabel ? t('Tanlangan run: {{period}}', { period: selectedRun.periodLabel }) : t('Payroll run tanlang')}
          widthClassName="max-w-xl"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{t('Run status')}:</span> {selectedRun?.status || '-'}
            </div>
            <Field label={t("O'qituvchi")}>
              <Combobox
                value={adjustmentForm.ownerKey}
                onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, ownerKey: e.target.value }))}
                disabled={!canEditSelectedRun || busy}
                placeholder={t('Tanlang')}
                noOptionsText={t('Xodim topilmadi')}
                options={selectedRunOwnerOptions}
              />
            </Field>
            <Field label={t('Turi')}>
              <Select
                value={adjustmentForm.type}
                onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, type: e.target.value }))}
                disabled={!canEditSelectedRun || busy}
              >
                <option value="BONUS">BONUS</option>
                <option value="PENALTY">PENALTY</option>
                <option value="MANUAL">MANUAL</option>
              </Select>
            </Field>
            <Field label={t('Summa')}>
              <MoneyInputUz
                value={adjustmentForm.amount}
                onValueChange={(raw) => setAdjustmentForm((prev) => ({ ...prev, amount: raw }))}
                disabled={!canEditSelectedRun || busy}
              />
            </Field>
            <Field label={t('Izoh')}>
              <Textarea
                rows={4}
                value={adjustmentForm.description}
                onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, description: e.target.value }))}
                disabled={!canEditSelectedRun || busy}
              />
            </Field>
            {!canEditSelectedRun && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {t("Adjustment faqat DRAFT run uchun qo'shiladi.")}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAdjustmentDrawerOpen(false)} disabled={busy}>
                {t('Bekor qilish')}
              </Button>
              <Button
                variant="indigo"
                disabled={!canEditSelectedRun || !adjustmentForm.ownerKey || !adjustmentForm.amount || !adjustmentForm.description.trim() || busy}
                onClick={handleAddAdjustment}
              >
                {t("Adjustment qo'shish")}
              </Button>
            </div>
          </div>
        </Drawer>

        <Modal
          open={payItemModal.open}
          onClose={closePayItemModal}
          title={t("Xodim bo'yicha to'lov")}
          subtitle={payItemModal.ownerLabel || '-'}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">{t("To'lanadi")}</div>
                <div className="mt-1 font-semibold text-slate-900">{formatMoney(payItemModal.payableAmount)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">{t("To'langan")}</div>
                <div className="mt-1 font-semibold text-slate-900">{formatMoney(payItemModal.paidAmount)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">{t('Qoldiq')}</div>
                <div className="mt-1 font-semibold text-slate-900">{formatMoney(Math.max(0, payItemModal.payableAmount - payItemModal.paidAmount))}</div>
              </div>
            </div>
            <Field label={t('Summa')}>
              <MoneyInputUz
                value={payItemForm.amount}
                onValueChange={(raw) => setPayItemForm((prev) => ({ ...prev, amount: raw }))}
                disabled={busy}
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label={t("To'lov usuli")}>
                <Select
                  value={payItemForm.paymentMethod}
                  onChange={(e) => setPayItemForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                  disabled={busy}
                >
                  <option value="BANK">BANK</option>
                  <option value="CASH">CASH</option>
                  <option value="CLICK">CLICK</option>
                  <option value="PAYME">PAYME</option>
                </Select>
              </Field>
              <Field label={t("To'langan sana (ixtiyoriy)")}>
                <Input
                  type="datetime-local"
                  value={payItemForm.paidAt}
                  onChange={(e) => setPayItemForm((prev) => ({ ...prev, paidAt: e.target.value }))}
                  disabled={busy}
                />
              </Field>
            </div>
            <Field label={t('External Ref')}>
              <Input
                value={payItemForm.externalRef}
                onChange={(e) => setPayItemForm((prev) => ({ ...prev, externalRef: e.target.value }))}
                disabled={busy}
              />
            </Field>
            <Field label={t('Izoh')}>
              <Textarea
                rows={3}
                value={payItemForm.note}
                onChange={(e) => setPayItemForm((prev) => ({ ...prev, note: e.target.value }))}
                disabled={busy}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closePayItemModal} disabled={busy}>
                {t('Bekor qilish')}
              </Button>
              <Button
                variant="success"
                onClick={handlePayItem}
                disabled={!payItemForm.amount || busy}
              >
                {t("To'lovni tasdiqlash")}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={employeeConfigModal.open}
          onClose={closeEmployeeConfigModal}
          title={t('Payroll Config tahrirlash')}
          subtitle={employeeConfigModal.displayName || '-'}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label={t('Payroll mode')}>
                <Select
                  value={employeeConfigModal.payrollMode}
                  onChange={(e) => setEmployeeConfigModal((prev) => ({ ...prev, payrollMode: e.target.value }))}
                  disabled={busy}
                >
                  <option value="LESSON_BASED">LESSON_BASED</option>
                  <option value="FIXED">FIXED</option>
                  <option value="MIXED">MIXED</option>
                  <option value="MANUAL_ONLY">MANUAL_ONLY</option>
                </Select>
              </Field>
              <Field label={t('Bandlik holati')}>
                <Select
                  value={employeeConfigModal.employmentStatus}
                  onChange={(e) => setEmployeeConfigModal((prev) => ({ ...prev, employmentStatus: e.target.value }))}
                  disabled={busy}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </Select>
              </Field>
              <Field label={t('Oklad')}>
                <MoneyInputUz
                  value={employeeConfigModal.fixedSalaryAmount}
                  onValueChange={(raw) => setEmployeeConfigModal((prev) => ({ ...prev, fixedSalaryAmount: raw }))}
                  disabled={busy}
                />
              </Field>
              <Field label={t('Payrollga kiradi')}>
                <Select
                  value={employeeConfigModal.isPayrollEligible ? 'true' : 'false'}
                  onChange={(e) =>
                    setEmployeeConfigModal((prev) => ({ ...prev, isPayrollEligible: e.target.value === 'true' }))
                  }
                  disabled={busy}
                >
                  <option value="true">{t('Ha')}</option>
                  <option value="false">{t("Yo'q")}</option>
                </Select>
              </Field>
            </div>
            <Field label={t('Izoh')}>
              <Textarea
                rows={4}
                value={employeeConfigModal.note}
                onChange={(e) => setEmployeeConfigModal((prev) => ({ ...prev, note: e.target.value }))}
                disabled={busy}
              />
            </Field>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {t("FIXED rejimda oklad bo'sh yoki 0 bo'lishi mumkin emas. Okladni tozalash uchun bo'sh qoldiring va boshqa mode tanlang.")}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeEmployeeConfigModal} disabled={busy}>
                {t('Bekor qilish')}
              </Button>
              <Button variant="indigo" onClick={handleSaveEmployeeConfig} disabled={busy || !employeeConfigModal.employeeId}>
                {t('Saqlash')}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={rateEditModal.open}
          onClose={closeRateEditModal}
          title={rateEditModal.kind === 'teacher' ? t('Teacher rate tahrirlash') : t('Subject rate tahrirlash')}
          subtitle={t("Rate qiymati va effective intervalni yangilang")}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {rateEditModal.kind === 'teacher' && (
                <Field label={t("O'qituvchi")}>
                  <Combobox
                    value={rateEditModal.teacherId}
                    onChange={(e) => setRateEditModal((prev) => ({ ...prev, teacherId: e.target.value }))}
                    disabled={busy}
                    placeholder={t('Tanlang')}
                    noOptionsText={t("O'qituvchi topilmadi")}
                    options={teacherComboboxOptions}
                  />
                </Field>
              )}
              <Field label={t('Fan')}>
                <Select
                  value={rateEditModal.subjectId}
                  onChange={(e) => setRateEditModal((prev) => ({ ...prev, subjectId: e.target.value }))}
                  disabled={busy}
                >
                  <option value="">{t('Tanlang')}</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('Soat narxi')}>
                <MoneyInputUz
                  value={rateEditModal.ratePerHour}
                  onValueChange={(raw) => setRateEditModal((prev) => ({ ...prev, ratePerHour: raw }))}
                  disabled={busy}
                />
              </Field>
              <Field label={t('effectiveFrom')}>
                <Input
                  type="date"
                  value={rateEditModal.effectiveFrom}
                  onChange={(e) => setRateEditModal((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
                  disabled={busy}
                />
              </Field>
              <Field label={t('effectiveTo')}>
                <Input
                  type="date"
                  value={rateEditModal.effectiveTo}
                  onChange={(e) => setRateEditModal((prev) => ({ ...prev, effectiveTo: e.target.value }))}
                  disabled={busy}
                />
              </Field>
              <Field label={t('Izoh')}>
                <Input
                  value={rateEditModal.note}
                  onChange={(e) => setRateEditModal((prev) => ({ ...prev, note: e.target.value }))}
                  disabled={busy}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeRateEditModal} disabled={busy}>
                {t('Bekor qilish')}
              </Button>
              <Button
                variant="indigo"
                onClick={handleSubmitRateEdit}
                disabled={
                  busy ||
                  !rateEditModal.subjectId ||
                  !rateEditModal.ratePerHour ||
                  !rateEditModal.effectiveFrom ||
                  (rateEditModal.kind === 'teacher' && !rateEditModal.teacherId)
                }
              >
                {t('Saqlash')}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={lessonStatusModal.open}
          onClose={closeLessonStatusModal}
          title={t('RealLesson statusini yangilash')}
          subtitle={lessonStatusModal.lessonLabel || t('Lesson tanlangan')}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {t('Joriy status')}: <span className="font-semibold text-slate-900">{lessonStatusModal.currentStatus || '-'}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label={t('Yangi status')}>
                <Select
                  value={lessonStatusModal.status}
                  onChange={(e) =>
                    setLessonStatusModal((prev) => ({
                      ...prev,
                      status: e.target.value,
                      replacedByTeacherId: e.target.value === 'REPLACED' ? prev.replacedByTeacherId : '',
                    }))
                  }
                  disabled={busy}
                >
                  <option value="DONE">DONE</option>
                  <option value="CANCELED">CANCELED</option>
                  <option value="REPLACED">REPLACED</option>
                </Select>
              </Field>
              <Field label={t('Replacement teacher')}>
                <Combobox
                  value={lessonStatusModal.replacedByTeacherId}
                  onChange={(e) => setLessonStatusModal((prev) => ({ ...prev, replacedByTeacherId: e.target.value }))}
                  disabled={busy || lessonStatusModal.status !== 'REPLACED'}
                  placeholder={t('Tanlang')}
                  noOptionsText={t("O'qituvchi topilmadi")}
                  options={teacherComboboxOptions}
                />
              </Field>
            </div>
            <Field label={t('Izoh')}>
              <Textarea
                rows={3}
                value={lessonStatusModal.note}
                onChange={(e) => setLessonStatusModal((prev) => ({ ...prev, note: e.target.value }))}
                disabled={busy}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeLessonStatusModal} disabled={busy}>
                {t('Bekor qilish')}
              </Button>
              <Button
                variant="indigo"
                onClick={handleSubmitLessonStatus}
                disabled={busy || (lessonStatusModal.status === 'REPLACED' && !lessonStatusModal.replacedByTeacherId)}
              >
                {t('Statusni saqlash')}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AutoTranslate>
  );
}




