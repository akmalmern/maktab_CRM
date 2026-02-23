import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../../../lib/apiClient';
import { saveDownloadedFile } from '../../../lib/downloadUtils';
import { ConfirmModal } from '../../../components/ui';
import {
  useCreateFinanceImtiyozMutation,
  useCreateFinancePaymentMutation,
  useDeactivateFinanceImtiyozMutation,
  useGetFinanceSettingsQuery,
  useGetFinanceStudentsQuery,
  useLazyGetFinanceStudentDetailQuery,
  useRevertFinancePaymentMutation,
  useRollbackFinanceTarifMutation,
  useUpdateFinanceSettingsMutation,
} from '../../../services/api/financeApi';
import {
  useExportAttendanceReportMutation,
  useExportFinanceDebtorsMutation,
} from '../../../services/api/exportApi';
import {
  useCreateStudentMutation,
  useCreateTeacherMutation,
  useDeleteStudentMutation,
  useGetTeachersQuery,
} from '../../../services/api/peopleApi';
import { useGetSubjectsQuery } from '../../../services/api/subjectsApi';
import { useGetClassroomsQuery } from '../../../services/api/classroomsApi';
import {
  AttendanceSection,
  ClassroomsSection,
  DashboardSection,
  FinanceSection,
  ScheduleSection,
  StudentsSection,
  SubjectsSection,
  TeachersSection,
} from './sections';

const DEFAULT_LIST_QUERY = {
  search: '',
  page: 1,
  limit: 10,
  filter: 'all',
  sort: 'name:asc',
};
const FINANCE_SEARCH_DEBOUNCE_MS = 350;

export default function AdminWorkspace({ section }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirmResolverRef = useRef(null);


  const [teacherQuery, setTeacherQuery] = useState(DEFAULT_LIST_QUERY);
  const [studentQuery, setStudentQuery] = useState(DEFAULT_LIST_QUERY);
  const [financeQuery, setFinanceQuery] = useState({
    search: '',
    page: 1,
    limit: 20,
    status: 'ALL',
    classroomId: 'all',
    debtMonth: 'ALL',
    debtTargetMonth: '',
    cashflowMonth: '',
  });
  const [debouncedFinanceSearch, setDebouncedFinanceSearch] = useState('');
  const [exporting, setExporting] = useState('');
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Tasdiqlash',
    message: '',
  });

  const isDashboardSection = section === 'dashboard';
  const isTeachersSection = section === 'teachers';
  const isSubjectsSection = section === 'subjects';
  const isStudentsSection = section === 'students';
  const isClassroomsSection = section === 'classrooms';
  const isJadvalSection = section === 'jadval';
  const isAttendanceSection = section === 'attendance';
  const isFinanceSection = section === 'finance';

  const financeStudentsParams = {
    page: financeQuery.page,
    limit: financeQuery.limit,
    status: financeQuery.status,
    debtMonth: financeQuery.debtMonth,
    debtTargetMonth: financeQuery.debtTargetMonth || undefined,
    cashflowMonth: financeQuery.cashflowMonth || undefined,
    search: debouncedFinanceSearch,
    classroomId: financeQuery.classroomId === 'all' ? undefined : financeQuery.classroomId,
  };
  const financeSettingsQuery = useGetFinanceSettingsQuery(undefined, { skip: !isFinanceSection });
  const financeStudentsQuery = useGetFinanceStudentsQuery(financeStudentsParams, { skip: !isFinanceSection });
  const shouldLoadSubjects = isTeachersSection || isStudentsSection || isJadvalSection;
  const shouldLoadClassrooms = isTeachersSection || isStudentsSection || isJadvalSection || isAttendanceSection || isFinanceSection;
  const subjectsQuery = useGetSubjectsQuery(undefined, { skip: !shouldLoadSubjects });
  const classroomsQuery = useGetClassroomsQuery(undefined, { skip: !shouldLoadClassrooms });
  const scheduleTeachersQuery = useGetTeachersQuery(
    { ...DEFAULT_LIST_QUERY, limit: 100, page: 1 },
    { skip: !isJadvalSection },
  );
  const [createTeacherMutation, createTeacherMutationState] = useCreateTeacherMutation();
  const [createStudentMutation, createStudentMutationState] = useCreateStudentMutation();
  const [deleteStudentMutation, deleteStudentMutationState] = useDeleteStudentMutation();
  const [fetchFinanceDetail, financeDetailQuery] = useLazyGetFinanceStudentDetailQuery();
  const [updateFinanceSettings, updateFinanceSettingsState] = useUpdateFinanceSettingsMutation();
  const [createFinancePayment, createFinancePaymentState] = useCreateFinancePaymentMutation();
  const [createFinanceImtiyoz, createFinanceImtiyozState] = useCreateFinanceImtiyozMutation();
  const [deactivateFinanceImtiyoz, deactivateFinanceImtiyozState] = useDeactivateFinanceImtiyozMutation();
  const [rollbackFinanceTarif, rollbackFinanceTarifState] = useRollbackFinanceTarifMutation();
  const [revertFinancePayment, revertFinancePaymentState] = useRevertFinancePaymentMutation();
  const [exportAttendanceReport] = useExportAttendanceReportMutation();
  const [exportFinanceDebtors] = useExportFinanceDebtorsMutation();

  const financeSettings = financeSettingsQuery.data?.settings || {
    oylikSumma: 0,
    yillikSumma: 0,
    faolTarifId: null,
  };
  const financeSettingsMeta = {
    constraints: financeSettingsQuery.data?.constraints || {
      minSumma: 50000,
      maxSumma: 50000000,
    },
    preview: financeSettingsQuery.data?.preview || {
      studentCount: 0,
      debtorCount: 0,
      tolayotganlar: 0,
      expectedMonthly: 0,
      expectedYearly: 0,
      gapMonthly: 0,
      gapYearly: 0,
      thisMonthPaidAmount: 0,
      thisYearPaidAmount: 0,
      cashflowDiffAmount: 0,
    },
    tarifHistory: financeSettingsQuery.data?.tarifHistory || [],
    tarifAudit: financeSettingsQuery.data?.tarifAudit || [],
  };
  const financeStudentsState = {
    items: financeStudentsQuery.data?.students || [],
    page: financeStudentsQuery.data?.page || 1,
    limit: financeStudentsQuery.data?.limit || financeQuery.limit,
    total: financeStudentsQuery.data?.total || 0,
    pages: financeStudentsQuery.data?.pages || 0,
    summary: financeStudentsQuery.data?.summary || {
      totalRows: 0,
      totalDebtors: 0,
      totalDebtAmount: 0,
      thisMonthDebtors: 0,
      previousMonthDebtors: 0,
      selectedMonthDebtors: 0,
      thisMonthDebtAmount: 0,
      previousMonthDebtAmount: 0,
      selectedMonthDebtAmount: 0,
      thisMonthPaidAmount: 0,
      thisYearPaidAmount: 0,
      monthlyPlanAmount: 0,
      yearlyPlanAmount: 0,
      tarifOylikSumma: 0,
      tarifYillikSumma: 0,
      cashflow: {
        month: null,
        monthFormatted: '',
        planAmount: 0,
        collectedAmount: 0,
        debtAmount: 0,
        diffAmount: 0,
      },
      selectedMonth: null,
    },
    loading: financeStudentsQuery.isLoading || financeStudentsQuery.isFetching,
    error: financeStudentsQuery.error?.message || null,
  };
  const financeDetailState = {
    student: financeDetailQuery.data?.student || null,
    imtiyozlar: financeDetailQuery.data?.imtiyozlar || [],
    transactions: financeDetailQuery.data?.transactions || [],
    loading: financeDetailQuery.isLoading || financeDetailQuery.isFetching,
    error: financeDetailQuery.error?.message || null,
  };
  const financeActionLoading =
    updateFinanceSettingsState.isLoading ||
    createFinancePaymentState.isLoading ||
    createFinanceImtiyozState.isLoading ||
    deactivateFinanceImtiyozState.isLoading ||
    rollbackFinanceTarifState.isLoading ||
    revertFinancePaymentState.isLoading;
  const peopleMutationLoading =
    createTeacherMutationState.isLoading ||
    createStudentMutationState.isLoading ||
    deleteStudentMutationState.isLoading;
  const subjects = { items: subjectsQuery.data?.subjects || [] };
  const classrooms = { items: classroomsQuery.data?.classrooms || [] };
  const teachers = {
    items: isJadvalSection
      ? (scheduleTeachersQuery.data?.teachers || [])
      : [],
  };

  useEffect(() => {
    if (isJadvalSection) {
      // Schedule section reads/writes via RTK Query
    }
  }, [isJadvalSection]);

  useEffect(() => {
    if (isAttendanceSection) {
      // Attendance section now reads via RTK Query in AttendanceSection
    }
  }, [isAttendanceSection]);

  useEffect(() => {
    if (!isFinanceSection) return;
    const timer = setTimeout(() => {
      setDebouncedFinanceSearch(financeQuery.search);
    }, FINANCE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [financeQuery.search, isFinanceSection]);

  useEffect(
    () => () => {
      if (confirmResolverRef.current) {
        confirmResolverRef.current(false);
        confirmResolverRef.current = null;
      }
    },
    [],
  );

  function askConfirm(message, title = t('Tasdiqlash')) {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({ open: true, title, message });
    });
  }

  function handleConfirmClose(result) {
    setConfirmState((prev) => ({ ...prev, open: false }));
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result);
      confirmResolverRef.current = null;
    }
  }

  async function handleDeleteStudent(id) {
    const ok = await askConfirm(t('Student ni o`chirmoqchimisiz?'), t("Studentni o'chirish"));
    if (!ok) return false;

    try {
      await deleteStudentMutation(id).unwrap();
      toast.success(t('Student o`chirildi'));
      return true;
    } catch (error) {
      toast.error(error?.message || t('Student o`chirilmadi'));
      return false;
    }
  }

  async function handleCreateTeacher(form) {
    try {
      const payload = await createTeacherMutation(form).unwrap();
      const teacherId = payload?.teacherId;
      toast.success(t('Teacher muvaffaqiyatli yaratildi'));
      if (teacherId) {
        navigate(`/admin/teachers/${teacherId}`);
      }
      return true;
    } catch (error) {
      toast.error(error?.message || t('Teacher yaratilmadi'));
      return false;
    }
  }

  async function handleCreateStudent(form) {
    try {
      const payload = await createStudentMutation(form).unwrap();
      const studentId = payload?.studentId;
      toast.success(t('Student muvaffaqiyatli yaratildi'));
      if (studentId) {
        navigate(`/admin/students/${studentId}`);
      }
      return true;
    } catch (error) {
      toast.error(error?.message || t('Student yaratilmadi'));
      return false;
    }
  }

  async function handleExportAttendance(format, params) {
    const safeFormat = format === 'xlsx' ? 'xlsx' : 'pdf';
    setExporting(safeFormat);
    try {
      const { blob, fileName } = await exportAttendanceReport({ format: safeFormat, params }).unwrap();
      const datePart = params?.sana || new Date().toISOString().slice(0, 10);
      const fallbackName = `davomat-hisobot-${datePart}.${safeFormat}`;
      saveDownloadedFile({ blob, fileName, fallbackName });
      toast.success(t('{{format}} fayl yuklab olindi', { format: safeFormat.toUpperCase() }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting('');
    }
  }

  async function handleSaveFinanceSettings(payload) {
    try {
      await updateFinanceSettings(payload).unwrap();
      toast.success(t('Tarif rejalandi'));
      financeSettingsQuery.refetch();
      return true;
    } catch (error) {
      toast.error(error?.message || t('Tarif saqlanmadi'));
      financeSettingsQuery.refetch();
      return false;
    }
  }

  async function handleOpenFinanceDetail(studentId) {
    try {
      await fetchFinanceDetail(studentId).unwrap();
    } catch (error) {
      toast.error(error?.message || t("Student to'lov ma'lumotlari olinmadi"));
    }
  }

  async function handleCreateFinancePayment(studentId, payload) {
    try {
      await createFinancePayment({ studentId, payload }).unwrap();
      toast.success(t("To'lov saqlandi"));
      return true;
    } catch (error) {
      toast.error(error?.message || t("To'lov saqlanmadi"));
      return false;
    }
  }

  async function handleCreateFinanceImtiyoz(studentId, payload) {
    try {
      await createFinanceImtiyoz({ studentId, payload }).unwrap();
      toast.success(t("Imtiyoz saqlandi"));
      return true;
    } catch (error) {
      toast.error(error?.message || t("Imtiyoz saqlanmadi"));
      return false;
    }
  }

  async function handleDeactivateFinanceImtiyoz(imtiyozId, payload) {
    try {
      await deactivateFinanceImtiyoz({ imtiyozId, payload }).unwrap();
      toast.success(t("Imtiyoz bekor qilindi"));
      return true;
    } catch (error) {
      toast.error(error?.message || t("Imtiyoz bekor qilinmadi"));
      return false;
    }
  }

  async function handleRollbackFinanceTarif(tarifId) {
    const ok = await askConfirm(
      t("Tanlangan tarifni rollback qilmoqchimisiz?"),
      t('Tarif rollback'),
    );
    if (!ok) return false;
    try {
      await rollbackFinanceTarif({ tarifId }).unwrap();
      toast.success(t('Tarif rollback qilindi'));
      financeSettingsQuery.refetch();
      financeStudentsQuery.refetch();
      return true;
    } catch (error) {
      toast.error(error?.message || t('Tarif rollback qilinmadi'));
      return false;
    }
  }

  async function handleRevertFinancePayment(tolovId) {
    const ok = await askConfirm(
      t("To'lov tranzaksiyasini bekor qilmoqchimisiz?"),
      t("To'lovni bekor qilish"),
    );
    if (!ok) return false;
    try {
      await revertFinancePayment(tolovId).unwrap();
      toast.success(t("To'lov bekor qilindi"));
      financeStudentsQuery.refetch();
      return true;
    } catch (error) {
      toast.error(error?.message || t("To'lov bekor qilinmadi"));
      return false;
    }
  }

  async function handleExportFinanceDebtors(format) {
    const safeFormat = format === 'xlsx' ? 'xlsx' : 'pdf';
    setExporting(safeFormat);
    try {
      const { blob, fileName } = await exportFinanceDebtors({
        format: safeFormat,
        params: {
          search: financeQuery.search || undefined,
          classroomId: financeQuery.classroomId === 'all' ? undefined : financeQuery.classroomId,
        },
      }).unwrap();
      const fallbackName = `moliya-qarzdorlar.${safeFormat}`;
      saveDownloadedFile({ blob, fileName, fallbackName });
      toast.success(t('{{format}} fayl yuklab olindi', { format: safeFormat.toUpperCase() }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting('');
    }
  }

  return (
    <div className="space-y-6">
      {isSubjectsSection && (
        <SubjectsSection />
      )}

      {isClassroomsSection && (
        <ClassroomsSection
          onOpenStudentDetail={(id) => navigate(`/admin/students/${id}`)}
          onDeleteStudent={handleDeleteStudent}
        />
      )}

      {isJadvalSection && (
        <ScheduleSection
          classrooms={classrooms.items}
          subjects={subjects.items}
          teachers={teachers.items}
        />
      )}

      {isAttendanceSection && (
        <AttendanceSection
          classrooms={classrooms.items}
          onExport={handleExportAttendance}
          exporting={exporting}
        />
      )}

      {isFinanceSection && (
        <FinanceSection
          classrooms={classrooms.items}
          settings={financeSettings}
          settingsMeta={financeSettingsMeta}
          studentsState={financeStudentsState}
          studentsSummary={financeStudentsState.summary}
          detailState={financeDetailState}
          query={financeQuery}
          actionLoading={financeActionLoading}
          onChangeQuery={(patch) => setFinanceQuery((prev) => ({ ...prev, ...patch }))}
          onRefresh={() => financeStudentsQuery.refetch()}
          onSaveSettings={handleSaveFinanceSettings}
          onOpenDetail={handleOpenFinanceDetail}
          onCreatePayment={handleCreateFinancePayment}
          onCreateImtiyoz={handleCreateFinanceImtiyoz}
          onDeactivateImtiyoz={handleDeactivateFinanceImtiyoz}
          onRollbackTarif={handleRollbackFinanceTarif}
          onRevertPayment={handleRevertFinancePayment}
          onExportDebtors={handleExportFinanceDebtors}
          exporting={exporting}
        />
      )}

      {isTeachersSection && (
        <TeachersSection
          actionLoading={peopleMutationLoading}
          subjects={subjects.items}
          classrooms={classrooms.items}
          onCreateTeacher={handleCreateTeacher}
          onCreateStudent={handleCreateStudent}
          teacherQuery={teacherQuery}
          setTeacherQuery={setTeacherQuery}
          onOpenDetail={(id) => navigate(`/admin/teachers/${id}`)}
        />
      )}

      {isStudentsSection && (
        <StudentsSection
          actionLoading={peopleMutationLoading}
          subjects={subjects.items}
          classrooms={classrooms.items}
          onCreateTeacher={handleCreateTeacher}
          onCreateStudent={handleCreateStudent}
          studentQuery={studentQuery}
          setStudentQuery={setStudentQuery}
          onOpenDetail={(id) => navigate(`/admin/students/${id}`)}
        />
      )}

      {isDashboardSection && (
        <DashboardSection />
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onCancel={() => handleConfirmClose(false)}
        onConfirm={() => handleConfirmClose(true)}
      />
    </div>
  );
}
