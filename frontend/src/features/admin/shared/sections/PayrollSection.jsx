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
  useCreatePayrollRealLessonMutation,
  useCreatePayrollSubjectRateMutation,
  useCreatePayrollTeacherRateMutation,
  useBulkUpdatePayrollRealLessonStatusMutation,
  useDeletePayrollAdjustmentMutation,
  useDeletePayrollSubjectRateMutation,
  useDeletePayrollTeacherRateMutation,
  useExportPayrollRunCsvMutation,
  useGeneratePayrollRunMutation,
  useGetPayrollRealLessonsQuery,
  useGetPayrollRunDetailQuery,
  useGetPayrollRunsQuery,
  useGetPayrollSubjectRatesQuery,
  useGetPayrollTeacherRatesQuery,
  usePayPayrollRunMutation,
  useReversePayrollRunMutation,
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
    BONUS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENALTY: 'bg-rose-50 text-rose-700 border-rose-200',
    MANUAL: 'bg-slate-100 text-slate-700 border-slate-200',
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

export default function PayrollSection() {
  const { t } = useTranslation();
  const role = useAppSelector((state) => state.auth.role);
  const isManagerView = role === 'MANAGER';
  const isAdminView = role === 'ADMIN';

  const [tab, setTab] = useState('runs');
  const [periodMonth, setPeriodMonth] = useState(getCurrentMonthKey());
  const [selectedRunId, setSelectedRunId] = useState('');
  const [runFilters, setRunFilters] = useState({ ...DEFAULT_RUN_FILTERS, periodMonth: getCurrentMonthKey() });
  const [lineFilters, setLineFilters] = useState(DEFAULT_LINE_FILTERS);
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
    { skip: isManagerView || tab !== 'rates' },
  );
  const payrollSubjectRatesQuery = useGetPayrollSubjectRatesQuery(
    { page: 1, limit: 100 },
    { skip: isManagerView || tab !== 'rates' },
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
    { skip: isManagerView || tab !== 'lessons' },
  );

  const [generatePayrollRun, generatePayrollRunState] = useGeneratePayrollRunMutation();
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
  const [deletePayrollAdjustment, deleteAdjustmentState] = useDeletePayrollAdjustmentMutation();
  const [approvePayrollRun, approvePayrollRunState] = useApprovePayrollRunMutation();
  const [payPayrollRun, payPayrollRunState] = usePayPayrollRunMutation();
  const [reversePayrollRun, reversePayrollRunState] = useReversePayrollRunMutation();
  const [exportPayrollRunCsv, exportPayrollRunCsvState] = useExportPayrollRunCsvMutation();

  const selectedRun = payrollRunDetailQuery.data?.run || null;
  const selectedRunLines = payrollRunDetailQuery.data?.lines?.items || [];

  const busy =
    generatePayrollRunState.isLoading ||
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
    deleteAdjustmentState.isLoading ||
    approvePayrollRunState.isLoading ||
    payPayrollRunState.isLoading ||
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
  const runsDashboard = useMemo(() => {
    const totals = {
      gross: 0,
      payable: 0,
      paid: 0,
      unpaid: 0,
      runCount: runs.length,
      draftCount: 0,
      approvedCount: 0,
      paidCount: 0,
      reversedCount: 0,
      teacherCount: 0,
    };
    for (const run of runs) {
      const gross = Number(run.grossAmount || 0);
      const payable = Number(run.payableAmount || 0);
      totals.gross += Number.isFinite(gross) ? gross : 0;
      totals.payable += Number.isFinite(payable) ? payable : 0;
      if (run.status === 'PAID') totals.paid += payable;
      if (run.status === 'DRAFT' || run.status === 'APPROVED') totals.unpaid += payable;
      if (run.status === 'DRAFT') totals.draftCount += 1;
      if (run.status === 'APPROVED') totals.approvedCount += 1;
      if (run.status === 'PAID') totals.paidCount += 1;
      if (run.status === 'REVERSED') totals.reversedCount += 1;
      totals.teacherCount = Math.max(totals.teacherCount, Number(run.teacherCount || 0));
    }
    return totals;
  }, [runs]);
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
      toast.success(t('Real lesson qo‘shildi'));
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
      lessonLabel: `${teacherName} • ${formatDateTime(row.startAt)}`,
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
      toast.success(t('Adjustment qo‘shildi'));
      setAdjustmentForm((prev) => ({ ...prev, amount: '', description: '' }));
      setAdjustmentDrawerOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const handleDeleteAdjustment = useCallback(async (lineId) => {
    if (!activeRunId) return;
    const ok = window.confirm(t("Adjustment ni o'chirmoqchimisiz?"));
    if (!ok) return;
    try {
      await deletePayrollAdjustment({ runId: activeRunId, lineId }).unwrap();
      toast.success(t("Adjustment o'chirildi"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [activeRunId, deletePayrollAdjustment, t]);

  async function handleApproveRun() {
    if (!activeRunId) return;
    const ok = window.confirm(t('Payroll run ni tasdiqlaysizmi?'));
    if (!ok) return;
    try {
      await approvePayrollRun(activeRunId).unwrap();
      toast.success(t('Payroll tasdiqlandi'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handlePayRun() {
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

  const runsColumns = useMemo(
    () => [
      { key: 'periodMonth', header: t('Oy'), render: (row) => row.periodMonth },
      {
        key: 'status',
        header: t('Holat'),
        render: (row) => <StatusPill value={row.status} />,
      },
      {
        key: 'totals',
        header: t('Jami'),
        render: (row) => (
          <div className="text-xs text-slate-700">
            <div>{t('Teacher')}: {row.teacherCount || 0}</div>
            <div>{t('Darslar')}: {row.sourceLessonsCount || 0}</div>
          </div>
        ),
      },
      {
        key: 'amounts',
        header: t('Summalar'),
        render: (row) => (
          <div className="text-xs text-slate-700">
            <div>{t('Brutto')}: {formatMoney(row.grossAmount)}</div>
            <div>{t('Adjustment')}: {formatMoney(row.adjustmentAmount)}</div>
            <div className="font-semibold">{t('To‘lanadi')}: {formatMoney(row.payableAmount)}</div>
          </div>
        ),
      },
      { key: 'generatedAt', header: t('Generate'), render: (row) => formatDateTime(row.generatedAt) },
      {
        key: 'actions',
        header: t('Amallar'),
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant={activeRunId === row.id ? 'indigo' : 'secondary'} onClick={() => setSelectedRunId(row.id)}>
              {t('Ko‘rish')}
            </Button>
          </div>
        ),
      },
    ],
    [activeRunId, t],
  );

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
      { key: 'minutes', header: t('Daqiqa'), render: (row) => row.totalMinutes || 0 },
      { key: 'hours', header: t('Soat'), render: (row) => row.totalHours || 0 },
      { key: 'grossAmount', header: t('Brutto'), render: (row) => formatMoney(row.grossAmount) },
      { key: 'adjustmentAmount', header: t('Adj'), render: (row) => formatMoney(row.adjustmentAmount) },
      { key: 'payableAmount', header: t('To‘lanadi'), render: (row) => formatMoney(row.payableAmount) },
    ],
    [t],
  );

  const runLinesColumns = useMemo(
    () => [
      { key: 'type', header: t('Turi'), render: (row) => <StatusPill value={row.type} /> },
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
      {
        key: 'lessonStartAt',
        header: t('Dars vaqti'),
        render: (row) => formatDateTime(row.lessonStartAt || row.realLesson?.startAt),
      },
      {
        key: 'context',
        header: t('Fan / Sinf'),
        render: (row) => (
          <div className="text-xs text-slate-700">
            <div>{row.subject?.name || '-'}</div>
            <div>{row.classroom ? `${row.classroom.name} (${row.classroom.academicYear})` : '-'}</div>
          </div>
        ),
      },
      { key: 'minutes', header: t('Daqiqa'), render: (row) => row.minutes ?? '-' },
      { key: 'ratePerHour', header: t('Rate'), render: (row) => (row.ratePerHour ? formatMoney(row.ratePerHour) : '-') },
      { key: 'amount', header: t('Summa'), render: (row) => formatMoney(row.amount) },
      { key: 'description', header: t('Izoh'), render: (row) => row.description || '-' },
      {
        key: 'actions',
        header: t('Amallar'),
        render: (row) =>
          row.type !== 'LESSON' && selectedRun?.status === 'DRAFT' && isAdminView ? (
            <Button size="sm" variant="danger" onClick={() => handleDeleteAdjustment(row.id)}>
              {t("O'chirish")}
            </Button>
          ) : (
            '-'
          ),
      },
    ],
    [isAdminView, selectedRun?.status, t, handleDeleteAdjustment],
  );

  const teacherRatesColumns = useMemo(
    () => [
      {
        key: 'teacher',
        header: t('O‘qituvchi'),
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
        header: t('O‘qituvchi'),
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

  const canEditSelectedRun = isAdminView && selectedRun?.status === 'DRAFT';
  const canApproveSelectedRun = (isAdminView || isManagerView) && selectedRun?.status === 'DRAFT';
  const canPaySelectedRun = isAdminView && selectedRun?.status === 'APPROVED';
  const canReverseSelectedRun = isAdminView && (selectedRun?.status === 'APPROVED' || selectedRun?.status === 'PAID');
  const payrollTabs = isManagerView
    ? [{ value: 'runs', label: t('Payroll Runs') }]
    : [
        { value: 'runs', label: t('Payroll Runs') },
        { value: 'rates', label: t('Rate sozlamalari') },
        { value: 'lessons', label: t('Real Lessons') },
      ];

  return (
    <AutoTranslate>
      <div className="space-y-4">
        <Card
          title={t("O'qituvchi Oyligi (Payroll)")}
          subtitle={
            isManagerView
              ? t("Menejer uchun review/approve rejimi. Generate, rate, real lesson va pay/reverse amallari yopiq.")
              : t("RealLesson asosida oylik hisoblang, adjustment kiriting, approve/pay/reverse qiling.")
          }
          actions={(
            <div className="flex flex-wrap items-end gap-2">
              <Field label={t('Oy')}>
                <Input
                  type="month"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  className="min-w-40"
                />
              </Field>
              {isAdminView && (
                <Button variant="indigo" onClick={handleGenerateRun} disabled={busy || !periodMonth}>
                  {t('Generate')}
                </Button>
              )}
            </div>
          )}
        >
          <Tabs
            value={tab}
            onChange={setTab}
            items={payrollTabs}
          />
        </Card>

        {tab === 'runs' && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <StatWidget
                label={t('Brutto (joriy filter)')}
                value={formatMoney(runsDashboard.gross)}
                tone="indigo"
                subtitle={t('{{count}} ta run', { count: runsDashboard.runCount })}
              />
              <StatWidget
                label={t("To'lanadi (jami)")}
                value={formatMoney(runsDashboard.payable)}
                tone="slate"
                subtitle={runFilters.periodMonth || periodMonth}
              />
              <StatWidget
                label={t("To'langan")}
                value={formatMoney(runsDashboard.paid)}
                tone="emerald"
                subtitle={t('PAID runlar: {{count}}', { count: runsDashboard.paidCount })}
              />
              <StatWidget
                label={t("Qoldiq / To'lanmagan")}
                value={formatMoney(runsDashboard.unpaid)}
                tone={runsDashboard.unpaid > 0 ? 'amber' : 'slate'}
                subtitle={t('DRAFT: {{d}} | APPROVED: {{a}}', { d: runsDashboard.draftCount, a: runsDashboard.approvedCount })}
              />
              <StatWidget
                label={t("O'qituvchilar soni")}
                value={String(selectedRun?.teacherCount || runsDashboard.teacherCount || 0)}
                tone="rose"
                subtitle={selectedRun ? `${selectedRun.periodMonth} | ${selectedRun.status}` : t('Tanlangan run yo‘q')}
              />
            </div>

            <Card
              title={t('Payroll Runlar')}
              subtitle={t("Generate qilingan oylik runlar ro'yxati")}
              actions={(
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Input
                    type="month"
                    value={runFilters.periodMonth}
                    onChange={(e) => setRunFilters((prev) => ({ ...prev, periodMonth: e.target.value, page: 1 }))}
                  />
                  <Select
                    value={runFilters.status}
                    onChange={(e) => setRunFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
                  >
                    <option value="">{t('Barcha status')}</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="PAID">PAID</option>
                    <option value="REVERSED">REVERSED</option>
                  </Select>
                  <Select
                    value={String(runFilters.limit)}
                    onChange={(e) => setRunFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                  >
                    {[10, 20, 50].map((size) => (
                      <option key={size} value={size}>{t('{{count}} ta', { count: size })}</option>
                    ))}
                  </Select>
                  <Button variant="secondary" onClick={() => payrollRunsQuery.refetch()} disabled={runsState.loading}>
                    {t('Yangilash')}
                  </Button>
                </div>
              )}
            >
              {runsState.loading && <StateView type="skeleton" />}
              {runsState.error && <StateView type="error" description={runsState.error} />}
              {!runsState.loading && !runsState.error && (
                <>
                  <DataTable columns={runsColumns} rows={runs} density="compact" />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                    <div>{t('Jami')}: {runsState.total}</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={runsState.page <= 1}
                        onClick={() => setRunFilters((prev) => ({ ...prev, page: Math.max(1, runsState.page - 1) }))}
                      >
                        {t('Oldingi')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={runsState.page >= runsState.pages}
                        onClick={() => setRunFilters((prev) => ({ ...prev, page: Math.min(runsState.pages, runsState.page + 1) }))}
                      >
                        {t('Keyingi')}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>

            <Card
              title={t('Tanlangan Run Tafsiloti')}
              subtitle={selectedRun ? `${selectedRun.periodMonth} • ${selectedRun.id}` : t('Run tanlang')}
            >
              {!activeRunId && <StateView type="empty" description={t('Run tanlang')} />}
              {activeRunId && runDetailLoading && <StateView type="skeleton" />}
              {activeRunId && runDetailError && <StateView type="error" description={runDetailError} />}
              {selectedRun && !runDetailLoading && !runDetailError && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">{t('Holat')}</div>
                      <div className="mt-1"><StatusPill value={selectedRun.status} /></div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">{t('Darslar')}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{selectedRun.sourceLessonsCount || 0}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">{t('Brutto')}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(selectedRun.grossAmount)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">{t('Adjustment')}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(selectedRun.adjustmentAmount)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">{t("To'lanadi")}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(selectedRun.payableAmount)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <Card title={t('Status amallari')} className="xl:col-span-1">
                      <div className="space-y-3">
                        <Button className="w-full" variant="secondary" disabled={busy || !activeRunId} onClick={handleExportRunCsv}>
                          {t('CSV yuklab olish')}
                        </Button>
                        <Button className="w-full" variant="indigo" disabled={!canApproveSelectedRun || busy} onClick={handleApproveRun}>
                          {t('Approve')}
                        </Button>
                        {isManagerView ? (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                            {t("Menejer bu bo'limda payrollni ko'radi va DRAFT runlarni approve qiladi.")}
                          </div>
                        ) : (
                          <>
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
                              <Field label={t("To'langan sana (ixtiyoriy)")}>
                                <Input
                                  type="datetime-local"
                                  value={payForm.paidAt}
                                  onChange={(e) => setPayForm((prev) => ({ ...prev, paidAt: e.target.value }))}
                                  disabled={!canPaySelectedRun || busy}
                                />
                              </Field>
                              <Field label={t('External Ref')}>
                                <Input
                                  value={payForm.externalRef}
                                  onChange={(e) => setPayForm((prev) => ({ ...prev, externalRef: e.target.value }))}
                                  disabled={!canPaySelectedRun || busy}
                                />
                              </Field>
                              <Field label={t('Izoh')}>
                                <Textarea
                                  rows={2}
                                  value={payForm.note}
                                  onChange={(e) => setPayForm((prev) => ({ ...prev, note: e.target.value }))}
                                  disabled={!canPaySelectedRun || busy}
                                />
                              </Field>
                              <Button className="w-full" variant="success" disabled={!canPaySelectedRun || busy} onClick={handlePayRun}>
                                {t('Pay (PAID)')}
                              </Button>
                            </div>
                            <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/40 p-3">
                              <Field label={t('Reverse sababi')}>
                                <Textarea
                                  rows={2}
                                  value={reverseReason}
                                  onChange={(e) => setReverseReason(e.target.value)}
                                  disabled={!canReverseSelectedRun || busy}
                                />
                              </Field>
                              <Button className="w-full" variant="danger" disabled={!canReverseSelectedRun || !reverseReason.trim() || busy} onClick={handleReverseRun}>
                                {t('Reverse')}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>

                    <Card title={t('Teacherlar kesimida')} className="xl:col-span-2">
                      <DataTable columns={runItemsColumns} rows={selectedRun.items || []} density="compact" maxHeightClassName="max-h-[280px]" />
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    {!isManagerView && (
                    <Card
                      title={t('Manual Adjustment')}
                      className="xl:col-span-1"
                      actions={(
                        <Button
                          size="sm"
                          variant="indigo"
                          disabled={!canEditSelectedRun || busy || !activeRunId}
                          onClick={() => setAdjustmentDrawerOpen(true)}
                        >
                          {t("Adjustment qo'shish")}
                        </Button>
                      )}
                    >
                      <div className="hidden space-y-3">
                        <Field label={t('O‘qituvchi')}>
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
                            rows={3}
                            value={adjustmentForm.description}
                            onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, description: e.target.value }))}
                            disabled={!canEditSelectedRun || busy}
                          />
                        </Field>
                        <Button
                          className="w-full"
                          variant="indigo"
                          disabled={!canEditSelectedRun || !adjustmentForm.ownerKey || !adjustmentForm.amount || !adjustmentForm.description.trim() || busy}
                          onClick={handleAddAdjustment}
                        >
                          {t("Adjustment qo'shish")}
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                          <div className="font-medium text-slate-900">{t("Qo'lda bonus/jarima qo'shish")}</div>
                          <div className="mt-1">{t("Forma endi drawer ichida ochiladi va line jadvali uchun joy ko'proq qoladi.")}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="text-slate-500">{t('Run')}</div>
                            <div className="font-medium text-slate-900">{selectedRun?.periodLabel || '-'}</div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="text-slate-500">{t('Status')}</div>
                            <div className="font-medium text-slate-900">{selectedRun?.status || '-'}</div>
                          </div>
                        </div>
                        {!canEditSelectedRun && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            {t("Adjustment faqat DRAFT run uchun qo'shiladi.")}
                          </div>
                        )}
                        <Button
                          className="w-full"
                          variant="secondary"
                          disabled={!canEditSelectedRun || busy || !activeRunId}
                          onClick={() => setAdjustmentDrawerOpen(true)}
                        >
                          {t('Drawerni ochish')}
                        </Button>
                      </div>
                    </Card>
                    )}

                    <Card title={t('Line lar')} className={isManagerView ? 'xl:col-span-3' : 'xl:col-span-2'}>
                      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                        <Combobox
                          value={lineFilters.ownerKey}
                          onChange={(e) => setLineFilters((prev) => ({ ...prev, ownerKey: e.target.value, page: 1 }))}
                          placeholder={t('Barcha xodim')}
                          noOptionsText={t('Xodim topilmadi')}
                          options={selectedRunOwnerOptions}
                        />
                        <Select
                          value={lineFilters.type}
                          onChange={(e) => setLineFilters((prev) => ({ ...prev, type: e.target.value, page: 1 }))}
                        >
                          <option value="">{t('Barcha type')}</option>
                          <option value="LESSON">LESSON</option>
                          <option value="BONUS">BONUS</option>
                          <option value="PENALTY">PENALTY</option>
                          <option value="MANUAL">MANUAL</option>
                        </Select>
                        <Select
                          value={String(lineFilters.limit)}
                          onChange={(e) => setLineFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                        >
                          {[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                        </Select>
                        <Button variant="secondary" onClick={() => payrollRunDetailQuery.refetch()} disabled={runDetailLoading}>
                          {t('Yangilash')}
                        </Button>
                      </div>
                      <DataTable columns={runLinesColumns} rows={selectedRunLines} density="compact" maxHeightClassName="max-h-[400px]" />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                        <div>{t('Jami line')}: {payrollRunDetailQuery.data?.lines?.total || 0}</div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={(payrollRunDetailQuery.data?.lines?.page || 1) <= 1}
                            onClick={() => setLineFilters((prev) => ({ ...prev, page: Math.max(1, (payrollRunDetailQuery.data?.lines?.page || 1) - 1) }))}
                          >
                            {t('Oldingi')}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={(payrollRunDetailQuery.data?.lines?.page || 1) >= (payrollRunDetailQuery.data?.lines?.pages || 1)}
                            onClick={() => setLineFilters((prev) => ({ ...prev, page: Math.min((payrollRunDetailQuery.data?.lines?.pages || 1), (payrollRunDetailQuery.data?.lines?.page || 1) + 1) }))}
                          >
                            {t('Keyingi')}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}

        {!isManagerView && tab === 'rates' && (
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
                <Field label={t('O‘qituvchi')}>
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

        {!isManagerView && tab === 'lessons' && (
          <>
            <Card title={t('Real Lesson qo‘shish')}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label={t('O‘qituvchi')}>
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
                      {t('Bulk status qo‘llash')}
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
