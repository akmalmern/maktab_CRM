import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useAppSelector } from '../../../../../app/hooks';
import { Button, Combobox, Modal, Select, Textarea } from '../../../../../components/ui';
import { getErrorMessage } from '../../../../../lib/apiClient';
import { formatScheduleSlotLabel } from '../../../../../lib/scheduleSlotLabel';
import {
  useBulkUpdatePayrollRealLessonStatusMutation,
  useCreatePayrollRealLessonMutation,
  useGetPayrollRealLessonsQuery,
  useUpdatePayrollRealLessonStatusMutation,
} from '../../../../../services/api/payrollApi';
import { PayrollLessonsPanel } from '../payroll/SettingsPanels';

const DEFAULT_LESSON_FILTERS = {
  page: 1,
  limit: 20,
  periodMonth: '',
  status: 'DONE',
  teacherId: '',
  subjectId: '',
  classroomId: '',
};
const DEFAULT_LESSON_DURATION_MINUTES = 45;
const DEFAULT_REAL_LESSON_ENTRY_MODE = 'MANUAL';
const HAFTA_KUNI_LABEL = {
  DUSHANBA: 'Dushanba',
  SESHANBA: 'Seshanba',
  CHORSHANBA: 'Chorshanba',
  PAYSHANBA: 'Payshanba',
  JUMA: 'Juma',
  SHANBA: 'Shanba',
};

function getCurrentMonthKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getCurrentDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function resolveLocale(language) {
  if (language === 'ru') return 'ru-RU';
  if (language === 'en') return 'en-US';
  return 'uz-UZ';
}

function formatDateTimeRaw(value, locale = 'uz-UZ') {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function addMinutesToDateTimeLocal(value, minutes) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeTimePart(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const [hoursRaw, minutesRaw] = raw.split(':');
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '';
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return '';
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function composeLocalDateTime(dateValue, timeValue) {
  const dateRaw = String(dateValue || '').trim();
  const time = normalizeTimePart(timeValue);
  if (!dateRaw || !time) return '';
  return `${dateRaw}T${time}`;
}

function resolveSlotDurationMinutes(startTimeRaw, endTimeRaw) {
  const startTime = normalizeTimePart(startTimeRaw);
  const endTime = normalizeTimePart(endTimeRaw);
  if (!startTime || !endTime) return '';
  const [startHours, startMinutes] = startTime.split(':').map((value) => Number.parseInt(value, 10));
  const [endHours, endMinutes] = endTime.split(':').map((value) => Number.parseInt(value, 10));
  const startTotal = (startHours * 60) + startMinutes;
  const endTotal = (endHours * 60) + endMinutes;
  if (endTotal <= startTotal) return '';
  return String(endTotal - startTotal);
}

function applyScheduleRowToLessonForm(form, scheduleRow) {
  if (!scheduleRow || !form?.scheduleDate) return form;
  const teacherId = scheduleRow.oqituvchiId || scheduleRow.oqituvchi?.id || '';
  const subjectId = scheduleRow.fanId || scheduleRow.fan?.id || '';
  const classroomId = scheduleRow.sinfId || scheduleRow.sinf?.id || '';
  const startAt = composeLocalDateTime(form.scheduleDate, scheduleRow.vaqtOraliq?.boshlanishVaqti);
  const endAt = composeLocalDateTime(form.scheduleDate, scheduleRow.vaqtOraliq?.tugashVaqti);
  const durationMinutes = resolveSlotDurationMinutes(
    scheduleRow.vaqtOraliq?.boshlanishVaqti,
    scheduleRow.vaqtOraliq?.tugashVaqti,
  );
  return {
    ...form,
    teacherId,
    subjectId,
    classroomId,
    startAt,
    endAt,
    durationMinutes,
    replacedByTeacherId: form.replacedByTeacherId === teacherId ? '' : form.replacedByTeacherId,
  };
}

function teacherOptionLabel(teacher) {
  if (!teacher) return '-';
  const fullName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();
  const username = teacher.user?.username ? `@${teacher.user.username}` : '';
  if (fullName && username) return `${fullName} (${username})`;
  return fullName || username || teacher.id || '-';
}

function getLessonStatusLabel(value, t) {
  const labels = {
    DONE: t('Bajarilgan'),
    CANCELED: t('Bekor qilingan'),
    REPLACED: t("Almashtirilgan"),
  };
  return labels[value] || value || '-';
}

function StatusPill({ value }) {
  const { t } = useTranslation();
  const colorMap = {
    DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELED: 'bg-slate-100 text-slate-700 border-slate-200',
    REPLACED: 'bg-violet-50 text-violet-700 border-violet-200',
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${colorMap[value] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      {getLessonStatusLabel(value, t)}
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

export default function PayrollRealLessonsManager({
  teachers = [],
  teachersState = {},
  subjects = [],
  classrooms = [],
  darslar = [],
}) {
  const { t, i18n } = useTranslation();
  const role = useAppSelector((state) => state.auth.role);
  const isAdminView = role === 'ADMIN';
  const locale = resolveLocale(i18n.language);

  const [lessonFilters, setLessonFilters] = useState({
    ...DEFAULT_LESSON_FILTERS,
    periodMonth: getCurrentMonthKey(),
  });
  const [realLessonForm, setRealLessonForm] = useState({
    entryMode: DEFAULT_REAL_LESSON_ENTRY_MODE,
    darsJadvaliId: '',
    scheduleDate: getCurrentDateKey(),
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
  const [lessonStatusModal, setLessonStatusModal] = useState({
    open: false,
    lessonId: '',
    sourceTeacherId: '',
    currentStatus: '',
    status: 'DONE',
    replacedByTeacherId: '',
    note: '',
    lessonLabel: '',
  });
  const [selectedRealLessonIds, setSelectedRealLessonIds] = useState([]);
  const [bulkLessonStatusForm, setBulkLessonStatusForm] = useState({
    status: 'DONE',
    replacedByTeacherId: '',
    note: '',
  });

  const [createPayrollRealLesson, createRealLessonState] = useCreatePayrollRealLessonMutation();
  const [updatePayrollRealLessonStatus, updateRealLessonStatusState] = useUpdatePayrollRealLessonStatusMutation();
  const [bulkUpdatePayrollRealLessonStatus, bulkUpdateRealLessonStatusState] = useBulkUpdatePayrollRealLessonStatusMutation();

  const payrollRealLessonsQuery = useGetPayrollRealLessonsQuery({
    page: lessonFilters.page,
    limit: lessonFilters.limit,
    ...(lessonFilters.periodMonth ? { periodMonth: lessonFilters.periodMonth } : {}),
    ...(lessonFilters.status ? { status: lessonFilters.status } : {}),
    ...(lessonFilters.teacherId ? { teacherId: lessonFilters.teacherId } : {}),
    ...(lessonFilters.subjectId ? { subjectId: lessonFilters.subjectId } : {}),
    ...(lessonFilters.classroomId ? { classroomId: lessonFilters.classroomId } : {}),
  });

  const busy =
    createRealLessonState.isLoading ||
    updateRealLessonStatusState.isLoading ||
    bulkUpdateRealLessonStatusState.isLoading;

  const realLessons = useMemo(
    () => payrollRealLessonsQuery.data?.realLessons || [],
    [payrollRealLessonsQuery.data?.realLessons],
  );
  const teacherMap = useMemo(() => new Map(teachers.map((tRow) => [tRow.id, tRow])), [teachers]);
  const subjectMap = useMemo(() => new Map(subjects.map((sRow) => [sRow.id, sRow])), [subjects]);
  const classroomMap = useMemo(() => new Map(classrooms.map((cRow) => [cRow.id, cRow])), [classrooms]);
  const scheduleMap = useMemo(
    () => new Map(darslar.filter((row) => row?.id).map((row) => [row.id, row])),
    [darslar],
  );
  const teacherComboboxOptions = useMemo(
    () =>
      teachers.map((teacher) => ({
        value: teacher.id,
        label: teacherOptionLabel(teacher),
        searchText: `${teacher.firstName || ''} ${teacher.lastName || ''} ${teacher.user?.username || ''}`,
      })),
    [teachers],
  );
  const replacementTeacherComboboxOptions = useMemo(
    () => teacherComboboxOptions.filter((option) => option.value !== realLessonForm.teacherId),
    [realLessonForm.teacherId, teacherComboboxOptions],
  );
  const scheduleLessonComboboxOptions = useMemo(
    () =>
      darslar
        .filter((row) => row?.id)
        .map((row) => {
          const weekdayKey = HAFTA_KUNI_LABEL[row.haftaKuni] || row.haftaKuni || '-';
          const weekday = t(weekdayKey, { defaultValue: weekdayKey });
          const slotName = row.vaqtOraliq?.nomi
            ? formatScheduleSlotLabel(row.vaqtOraliq.nomi, i18n.language)
            : '-';
          const slotTime = row.vaqtOraliq?.boshlanishVaqti && row.vaqtOraliq?.tugashVaqti
            ? `${row.vaqtOraliq.boshlanishVaqti}-${row.vaqtOraliq.tugashVaqti}`
            : '';
          const teacherName = row.oqituvchi
            ? `${row.oqituvchi.firstName || ''} ${row.oqituvchi.lastName || ''}`.trim()
            : teacherOptionLabel(teacherMap.get(row.oqituvchiId));
          const subjectName = row.fan?.name || subjectMap.get(row.fanId)?.name || '-';
          const classroom = row.sinf || classroomMap.get(row.sinfId);
          const classroomName = classroom ? `${classroom.name} (${classroom.academicYear})` : '-';
          const slotLabel = slotTime ? `${slotName} (${slotTime})` : slotName;
          const label = `${weekday} | ${slotLabel} | ${teacherName} | ${subjectName} | ${classroomName}`;
          return {
            value: row.id,
            label,
            searchText: `${weekday} ${slotName} ${slotTime} ${teacherName} ${subjectName} ${classroomName}`,
          };
        }),
    [classroomMap, darslar, i18n.language, subjectMap, t, teacherMap],
  );
  const formatDateTime = useCallback((value) => formatDateTimeRaw(value, locale), [locale]);
  const realLessonSubjectAutoFilled = useMemo(() => {
    const selectedTeacher = teacherMap.get(realLessonForm.teacherId);
    return Boolean(selectedTeacher?.subject?.id && selectedTeacher.subject.id === realLessonForm.subjectId);
  }, [realLessonForm.subjectId, realLessonForm.teacherId, teacherMap]);
  const lessonStatusReplacementOptions = useMemo(
    () => teacherComboboxOptions.filter((option) => option.value !== lessonStatusModal.sourceTeacherId),
    [lessonStatusModal.sourceTeacherId, teacherComboboxOptions],
  );

  const realLessonPageIds = useMemo(
    () => (realLessons.map((row) => row.id).filter(Boolean)),
    [realLessons],
  );
  const selectedRealLessonIdsOnPage = useMemo(
    () => selectedRealLessonIds.filter((id) => realLessonPageIds.includes(id)),
    [realLessonPageIds, selectedRealLessonIds],
  );
  const allRealLessonsPageSelected =
    realLessonPageIds.length > 0 && realLessonPageIds.every((id) => selectedRealLessonIdsOnPage.includes(id));
  const someRealLessonsPageSelected =
    selectedRealLessonIdsOnPage.length > 0 && !allRealLessonsPageSelected;
  const realLessonLockedBySchedule = realLessonForm.entryMode === 'SCHEDULE';

  const notifyPayrollAutoRun = useCallback((payrollAutoRun) => {
    if (!payrollAutoRun || Number(payrollAutoRun.attemptedCount || 0) <= 0) return;
    const refreshedCount = Number(payrollAutoRun.refreshedCount || 0);
    const skippedCount = Number(payrollAutoRun.skippedCount || 0);
    if (skippedCount > 0) {
      toast.info(
        t("Dars saqlandi. Oylik draft: {{refreshed}} ta yangilandi, {{skipped}} ta keyinga qoldi", {
          refreshed: refreshedCount,
          skipped: skippedCount,
        }),
      );
    }
  }, [t]);

  const handleRealLessonTeacherChange = useCallback((event) => {
    const teacherId = event.target.value;
    const teacher = teacherMap.get(teacherId);
    const autoSubjectId = teacher?.subject?.id || '';
    setRealLessonForm((prev) => ({
      ...prev,
      teacherId,
      subjectId: autoSubjectId,
      replacedByTeacherId: prev.replacedByTeacherId === teacherId ? '' : prev.replacedByTeacherId,
    }));
  }, [setRealLessonForm, teacherMap]);

  const handleRealLessonSubjectChange = useCallback((event) => {
    const subjectId = event.target.value;
    setRealLessonForm((prev) => ({ ...prev, subjectId }));
  }, [setRealLessonForm]);

  const handleRealLessonStartChange = useCallback((event) => {
    const startAt = event.target.value;
    setRealLessonForm((prev) => {
      const currentEndAt = prev.endAt;
      const startMs = startAt ? new Date(startAt).getTime() : Number.NaN;
      const endMs = currentEndAt ? new Date(currentEndAt).getTime() : Number.NaN;
      const shouldAutoSetEnd = startAt && (!currentEndAt || !Number.isFinite(endMs) || endMs <= startMs);
      return {
        ...prev,
        startAt,
        endAt: shouldAutoSetEnd ? addMinutesToDateTimeLocal(startAt, DEFAULT_LESSON_DURATION_MINUTES) : currentEndAt,
      };
    });
  }, [setRealLessonForm]);

  const handleRealLessonEntryModeChange = useCallback((event) => {
    const entryMode = event.target.value;
    setRealLessonForm((prev) => {
      const next = {
        ...prev,
        entryMode,
        darsJadvaliId: entryMode === 'SCHEDULE' ? prev.darsJadvaliId : '',
      };
      if (entryMode !== 'SCHEDULE' || !next.darsJadvaliId) return next;
      return applyScheduleRowToLessonForm(next, scheduleMap.get(next.darsJadvaliId));
    });
  }, [scheduleMap]);

  const handleRealLessonScheduleChange = useCallback((event) => {
    const darsJadvaliId = event.target.value;
    setRealLessonForm((prev) => {
      const next = { ...prev, darsJadvaliId };
      if (prev.entryMode !== 'SCHEDULE' || !darsJadvaliId) return next;
      return applyScheduleRowToLessonForm(next, scheduleMap.get(darsJadvaliId));
    });
  }, [scheduleMap]);

  const handleRealLessonScheduleDateChange = useCallback((event) => {
    const scheduleDate = event.target.value;
    setRealLessonForm((prev) => {
      const next = { ...prev, scheduleDate };
      if (prev.entryMode !== 'SCHEDULE' || !prev.darsJadvaliId) return next;
      return applyScheduleRowToLessonForm(next, scheduleMap.get(prev.darsJadvaliId));
    });
  }, [scheduleMap]);

  async function handleCreateRealLesson() {
    if (!isAdminView) {
      toast.error(t("Bu amal faqat admin uchun ochiq"));
      return;
    }
    if (realLessonForm.entryMode === 'SCHEDULE' && !realLessonForm.darsJadvaliId) {
      toast.error(t('Dars jadvalidan darsni tanlang'));
      return;
    }
    if (realLessonForm.entryMode === 'SCHEDULE' && !realLessonForm.scheduleDate) {
      toast.error(t('Dars sanasini tanlang'));
      return;
    }
    if (realLessonForm.entryMode === 'SCHEDULE' && (!realLessonForm.startAt || !realLessonForm.endAt)) {
      toast.error(t("Tanlangan dars jadvali vaqtini tekshiring"));
      return;
    }
    if (realLessonForm.status === 'REPLACED' && realLessonForm.replacedByTeacherId === realLessonForm.teacherId) {
      toast.error(t("Asosiy va o'rinbosar o'qituvchi bir xil bo'lishi mumkin emas"));
      return;
    }
    try {
      const result = await createPayrollRealLesson({
        teacherId: realLessonForm.teacherId,
        subjectId: realLessonForm.subjectId,
        classroomId: realLessonForm.classroomId,
        ...(realLessonForm.entryMode === 'SCHEDULE' && realLessonForm.darsJadvaliId
          ? { darsJadvaliId: realLessonForm.darsJadvaliId }
          : {}),
        startAt: realLessonForm.startAt,
        endAt: realLessonForm.endAt,
        ...(realLessonForm.durationMinutes ? { durationMinutes: Number(realLessonForm.durationMinutes) } : {}),
        status: realLessonForm.status,
        ...(realLessonForm.status === 'REPLACED' && realLessonForm.replacedByTeacherId
          ? { replacedByTeacherId: realLessonForm.replacedByTeacherId }
          : {}),
        ...(realLessonForm.note ? { note: realLessonForm.note } : {}),
      }).unwrap();
      toast.success(t("O'tilgan dars qo'shildi"));
      notifyPayrollAutoRun(result?.payrollAutoRun);
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
      sourceTeacherId: row.teacherId || '',
      currentStatus: row.status || '',
      status: row.status || 'DONE',
      replacedByTeacherId: row.replacedByTeacherId || '',
      note: row.note || '',
      lessonLabel: `${teacherName} - ${formatDateTime(row.startAt)}`,
    });
  }, [formatDateTime, teacherMap]);

  function closeLessonStatusModal() {
    setLessonStatusModal((prev) => ({ ...prev, open: false }));
  }

  async function handleSubmitLessonStatus() {
    if (!isAdminView) {
      toast.error(t("Bu amal faqat admin uchun ochiq"));
      return;
    }
    if (!lessonStatusModal.lessonId) return;
    if (lessonStatusModal.status === 'REPLACED' && !lessonStatusModal.replacedByTeacherId) {
      toast.error(t("O'rinbosar o'qituvchini tanlang"));
      return;
    }
    if (lessonStatusModal.status === 'REPLACED' && lessonStatusModal.replacedByTeacherId === lessonStatusModal.sourceTeacherId) {
      toast.error(t("Asosiy va o'rinbosar o'qituvchi bir xil bo'lishi mumkin emas"));
      return;
    }
    try {
      const result = await updatePayrollRealLessonStatus({
        lessonId: lessonStatusModal.lessonId,
        payload: {
          status: lessonStatusModal.status,
          ...(lessonStatusModal.status === 'REPLACED'
            ? { replacedByTeacherId: lessonStatusModal.replacedByTeacherId }
            : { replacedByTeacherId: null }),
          note: lessonStatusModal.note || null,
        },
      }).unwrap();
      toast.success(t("O'tilgan dars holati yangilandi"));
      notifyPayrollAutoRun(result?.payrollAutoRun);
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
    if (!isAdminView) {
      toast.error(t("Bu amal faqat admin uchun ochiq"));
      return;
    }
    if (!selectedRealLessonIdsOnPage.length) {
      toast.error(t('Kamida bitta darsni tanlang'));
      return;
    }
    if (bulkLessonStatusForm.status === 'REPLACED' && !bulkLessonStatusForm.replacedByTeacherId) {
      toast.error(t("O'rinbosar o'qituvchini tanlang"));
      return;
    }
    if (bulkLessonStatusForm.status === 'REPLACED') {
      const selectedRows = realLessons.filter((row) => selectedRealLessonIdsOnPage.includes(row.id));
      const hasSelfReplacement = selectedRows.some((row) => row.teacherId === bulkLessonStatusForm.replacedByTeacherId);
      if (hasSelfReplacement) {
        toast.error(t("Tanlangan darslar ichida asosiy o'qituvchi o'zi bilan almashtirilgan holat bor"));
        return;
      }
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
        toast.success(t("Ommaviy yangilash: {{updated}} ta yangilandi, {{skipped}} ta o'tkazib yuborildi", { updated: updatedCount, skipped: skippedCount }));
      } else if (updatedCount) {
        toast.success(t("Ommaviy yangilash: {{updated}} ta dars yangilandi", { updated: updatedCount }));
      } else {
        toast.error(t("Tanlangan darslar yangilanmadi (hammasi o'tkazib yuborildi)"));
      }
      notifyPayrollAutoRun(result?.payrollAutoRun);
      setSelectedRealLessonIds([]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

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
        header: t("O'qituvchi"),
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
              {t("Holatni o'zgartirish")}
            </Button>
          ) : (
            '-'
          ),
      },
    ],
    [
      allRealLessonsPageSelected,
      classroomMap,
      formatDateTime,
      isAdminView,
      openLessonStatusModal,
      selectedRealLessonIds,
      subjectMap,
      t,
      teacherMap,
      toggleRealLessonSelection,
      toggleSelectAllRealLessonsOnPage,
    ],
  );

  return (
    <>
      {teachersState.partial ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t("O'qituvchilar ro'yxati qisman yuklandi. Qidiruvda hammasi chiqmasligi mumkin.")}
        </div>
      ) : null}

      <PayrollLessonsPanel
        tab="settings"
        settingsTab="lessons"
        isManagerView={false}
        isAdminView={isAdminView}
        busy={busy}
        realLessonForm={realLessonForm}
        setRealLessonForm={setRealLessonForm}
        onRealLessonTeacherChange={handleRealLessonTeacherChange}
        onRealLessonSubjectChange={handleRealLessonSubjectChange}
        onRealLessonStartChange={handleRealLessonStartChange}
        onRealLessonEntryModeChange={handleRealLessonEntryModeChange}
        onRealLessonScheduleChange={handleRealLessonScheduleChange}
        onRealLessonScheduleDateChange={handleRealLessonScheduleDateChange}
        replacementTeacherComboboxOptions={replacementTeacherComboboxOptions}
        realLessonSubjectAutoFilled={realLessonSubjectAutoFilled}
        realLessonLockedBySchedule={realLessonLockedBySchedule}
        scheduleLessonComboboxOptions={scheduleLessonComboboxOptions}
        teacherComboboxOptions={teacherComboboxOptions}
        subjects={subjects}
        classrooms={classrooms}
        handleCreateRealLesson={handleCreateRealLesson}
        lessonFilters={lessonFilters}
        setLessonFilters={setLessonFilters}
        payrollRealLessonsQuery={payrollRealLessonsQuery}
        selectedRealLessonIdsOnPage={selectedRealLessonIdsOnPage}
        someRealLessonsPageSelected={someRealLessonsPageSelected}
        setSelectedRealLessonIds={setSelectedRealLessonIds}
        bulkLessonStatusForm={bulkLessonStatusForm}
        setBulkLessonStatusForm={setBulkLessonStatusForm}
        handleBulkLessonStatusUpdate={handleBulkLessonStatusUpdate}
        realLessonsColumns={realLessonsColumns}
        realLessons={realLessons}
      />

      <Modal
        open={lessonStatusModal.open}
        onClose={closeLessonStatusModal}
        title={t("O'tilgan dars holatini yangilash")}
        subtitle={lessonStatusModal.lessonLabel || t('Dars tanlangan')}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {t('Joriy holat')}: <span className="font-semibold text-slate-900">{getLessonStatusLabel(lessonStatusModal.currentStatus, t)}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={t('Yangi holat')}>
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
                <option value="DONE">{getLessonStatusLabel('DONE', t)}</option>
                <option value="CANCELED">{getLessonStatusLabel('CANCELED', t)}</option>
                <option value="REPLACED">{getLessonStatusLabel('REPLACED', t)}</option>
              </Select>
            </Field>
            <Field label={t("O'rinbosar o'qituvchi")}>
              <Combobox
                value={lessonStatusModal.replacedByTeacherId}
                onChange={(e) => setLessonStatusModal((prev) => ({ ...prev, replacedByTeacherId: e.target.value }))}
                disabled={busy || lessonStatusModal.status !== 'REPLACED'}
                placeholder={t('Tanlang')}
                noOptionsText={t("O'qituvchi topilmadi")}
                options={lessonStatusReplacementOptions}
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
              {t("Holatni saqlash")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
