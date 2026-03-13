import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConfirmModal } from '../../../components/ui';
import useScheduleTeachersDirectory from './useScheduleTeachersDirectory';
import useAdminWorkspaceActions from './useAdminWorkspaceActions';
import {
  buildFinanceStudentsParams,
} from './financeQueryParams';
import AdminWorkspaceContent from './AdminWorkspaceContent';
import {
  DEFAULT_FINANCE_QUERY,
  normalizeFinanceQuery,
  readFinanceQueryFromSearchParams,
} from './adminWorkspaceFinanceState';
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
  useLazyGetTeachersQuery,
} from '../../../services/api/peopleApi';
import { useGetSubjectsQuery } from '../../../services/api/subjectsApi';
import { useGetClassroomsQuery } from '../../../services/api/classroomsApi';

const DEFAULT_LIST_QUERY = {
  search: '',
  page: 1,
  limit: 10,
  filter: 'all',
  sort: 'name:asc',
};
const FINANCE_SEARCH_DEBOUNCE_MS = 350;

function createRequestIdempotencyKey() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `${hex()}-${hex().slice(0, 4)}-4${hex().slice(0, 3)}-a${hex().slice(0, 3)}-${hex()}${hex().slice(0, 4)}`;
}

export default function AdminWorkspace({ section }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const confirmResolverRef = useRef(null);


  const [teacherQuery, setTeacherQuery] = useState(DEFAULT_LIST_QUERY);
  const [studentQuery, setStudentQuery] = useState(DEFAULT_LIST_QUERY);
  const [financeQuery, setFinanceQuery] = useState(() =>
    normalizeFinanceQuery({
      ...DEFAULT_FINANCE_QUERY,
      ...readFinanceQueryFromSearchParams(searchParams),
    }),
  );
  const [debouncedFinanceSearch, setDebouncedFinanceSearch] = useState('');
  const [exporting, setExporting] = useState('');
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Tasdiqlash',
    message: '',
  });
  const isTeachersSection = section === 'teachers';
  const isStudentsSection = section === 'students';
  const isArchiveSection = section === 'archive';
  const isJadvalSection = section === 'jadval';
  const isAttendanceSection = section === 'attendance';
  const isFinanceSection = section === 'finance';
  const isPayrollSection = section === 'payroll';

  const financeStudentsParams = buildFinanceStudentsParams(financeQuery, debouncedFinanceSearch);
  const financeSettingsQuery = useGetFinanceSettingsQuery(undefined, { skip: !isFinanceSection });
  const financeStudentsQuery = useGetFinanceStudentsQuery(financeStudentsParams, { skip: !isFinanceSection });
  const shouldLoadSubjects = isTeachersSection || isStudentsSection || isJadvalSection || isArchiveSection || isPayrollSection;
  const shouldLoadClassrooms =
    isTeachersSection || isStudentsSection || isJadvalSection || isAttendanceSection || isFinanceSection || isArchiveSection || isPayrollSection;
  const subjectsQuery = useGetSubjectsQuery(undefined, { skip: !shouldLoadSubjects });
  const classroomsQuery = useGetClassroomsQuery(undefined, { skip: !shouldLoadClassrooms });
  const [fetchTeachersPage] = useLazyGetTeachersQuery();
  const scheduleTeachersState = useScheduleTeachersDirectory({
    enabled: isJadvalSection,
    fetchTeachersPage,
    baseQuery: DEFAULT_LIST_QUERY,
  });
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
    tolovOylarSoni: 10,
    billingCalendar: null,
    faolTarifId: null,
  };
  const financeSettingsMeta = {
    constraints: financeSettingsQuery.data?.constraints || {
      minSumma: 50000,
      maxSumma: 50000000,
      billingMonthsOptions: [9, 10, 11, 12],
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
      thisMonthPayrollPayoutAmount: 0,
      thisMonthPayrollNetAmount: 0,
      thisMonthNetCashflowAmount: 0,
      cashflowDiffAmount: 0,
    },
    tarifHistory: financeSettingsQuery.data?.tarifHistory || [],
    tarifAudit: financeSettingsQuery.data?.tarifAudit || [],
  };
  const financeSummaryFallback = {
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
    tarifTolovOylarSoni: 10,
    cashflow: {
      month: null,
      monthFormatted: '',
      planAmount: 0,
      collectedAmount: 0,
      payrollPayoutAmount: 0,
      payrollReversalAmount: 0,
      payrollNetAmount: 0,
      netAmount: 0,
      debtAmount: 0,
      diffAmount: 0,
    },
    selectedMonth: null,
  };
  const effectiveFinanceSummary = financeStudentsQuery.data?.summary || financeSummaryFallback;

  const financeStudentsState = {
    items: financeStudentsQuery.data?.students || [],
    page: financeStudentsQuery.data?.page || 1,
    limit: financeStudentsQuery.data?.limit || financeQuery.limit,
    total: financeStudentsQuery.data?.total || 0,
    pages: financeStudentsQuery.data?.pages || 0,
    summary: effectiveFinanceSummary,
    loading: financeStudentsQuery.isLoading || financeStudentsQuery.isFetching,
    error: financeStudentsQuery.error?.message || null,
  };
  const financeDetailState = {
    student: financeDetailQuery.data?.student || null,
    majburiyatlar: financeDetailQuery.data?.majburiyatlar || [],
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
      ? scheduleTeachersState.items
      : [],
    total: scheduleTeachersState.total,
    loading: scheduleTeachersState.loading,
    partial: scheduleTeachersState.partial,
    error: scheduleTeachersState.error,
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

  const {
    handleDeleteStudent,
    handleCreateTeacher,
    handleCreateStudent,
    handleExportAttendance,
    handleSaveFinanceSettings,
    handleOpenFinanceDetail,
    handleCreateFinancePayment,
    handleCreateFinanceImtiyoz,
    handleDeactivateFinanceImtiyoz,
    handleRollbackFinanceTarif,
    handleRevertFinancePayment,
    handleExportFinanceDebtors,
    handleFinanceQueryChange,
  } = useAdminWorkspaceActions({
    t,
    navigate,
    askConfirm,
    setExporting,
    deleteStudentMutation,
    createTeacherMutation,
    createStudentMutation,
    exportAttendanceReport,
    updateFinanceSettings,
    fetchFinanceDetail,
    createFinancePayment,
    createFinanceImtiyoz,
    deactivateFinanceImtiyoz,
    rollbackFinanceTarif,
    revertFinancePayment,
    exportFinanceDebtors,
    financeSettingsQuery,
    financeStudentsQuery,
    financeQuery,
    isFinanceSection,
    searchParams,
    setSearchParams,
    setFinanceQuery,
    createRequestIdempotencyKey,
  });

  return (
    <div className="space-y-6">
      <AdminWorkspaceContent
        section={section}
        navigate={navigate}
        handleDeleteStudent={handleDeleteStudent}
        classrooms={classrooms}
        subjects={subjects}
        teachers={teachers}
        exporting={exporting}
        handleExportAttendance={handleExportAttendance}
        financeSettings={financeSettings}
        financeSettingsMeta={financeSettingsMeta}
        financeStudentsState={financeStudentsState}
        financeDetailState={financeDetailState}
        financeQuery={financeQuery}
        financeActionLoading={financeActionLoading}
        handleFinanceQueryChange={handleFinanceQueryChange}
        financeStudentsQuery={financeStudentsQuery}
        handleSaveFinanceSettings={handleSaveFinanceSettings}
        handleOpenFinanceDetail={handleOpenFinanceDetail}
        handleCreateFinancePayment={handleCreateFinancePayment}
        handleCreateFinanceImtiyoz={handleCreateFinanceImtiyoz}
        handleDeactivateFinanceImtiyoz={handleDeactivateFinanceImtiyoz}
        handleRollbackFinanceTarif={handleRollbackFinanceTarif}
        handleRevertFinancePayment={handleRevertFinancePayment}
        handleExportFinanceDebtors={handleExportFinanceDebtors}
        peopleMutationLoading={peopleMutationLoading}
        handleCreateTeacher={handleCreateTeacher}
        handleCreateStudent={handleCreateStudent}
        teacherQuery={teacherQuery}
        setTeacherQuery={setTeacherQuery}
        studentQuery={studentQuery}
        setStudentQuery={setStudentQuery}
      />

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
