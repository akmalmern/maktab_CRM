import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { apiDownload, getErrorMessage } from '../../../lib/apiClient';
import { ConfirmModal } from '../../../components/ui';
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
import {
  createClassroomThunk,
  previewPromoteClassroomThunk,
  promoteClassroomThunk,
  previewAnnualClassPromotionThunk,
  runAnnualClassPromotionThunk,
  createDarsJadvaliThunk,
  createStudentThunk,
  createSubjectThunk,
  createTeacherThunk,
  createVaqtOraliqThunk,
  deleteDarsJadvaliThunk,
  deleteSubjectThunk,
  deleteStudentThunk,
  deleteTeacherThunk,
  deleteVaqtOraliqThunk,
  fetchClassroomsThunk,
  fetchDarsJadvaliThunk,
  fetchSubjectsThunk,
  fetchStudentsThunk,
  fetchTeachersThunk,
  fetchVaqtOraliqlariThunk,
  fetchAttendanceReportThunk,
  fetchFinanceSettingsThunk,
  fetchFinanceStudentsThunk,
  fetchFinanceStudentDetailThunk,
  createFinancePaymentThunk,
  createFinanceImtiyozThunk,
  deactivateFinanceImtiyozThunk,
  updateFinanceSettingsThunk,
  updateDarsJadvaliThunk,
} from './index';

const DEFAULT_LIST_QUERY = {
  search: '',
  page: 1,
  limit: 10,
  filter: 'all',
  sort: 'name:asc',
};
const FINANCE_SEARCH_DEBOUNCE_MS = 350;

export default function AdminWorkspace({ section }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const confirmResolverRef = useRef(null);

  const teachers = useAppSelector((state) => state.admin.teachers);
  const students = useAppSelector((state) => state.admin.students);
  const subjects = useAppSelector((state) => state.admin.subjects);
  const classrooms = useAppSelector((state) => state.admin.classrooms);
  const vaqtOraliqlari = useAppSelector((state) => state.admin.schedule.vaqtOraliqlari);
  const darsJadvali = useAppSelector((state) => state.admin.schedule.darsJadvali);
  const attendance = useAppSelector((state) => state.admin.attendance);
  const finance = useAppSelector((state) => state.admin.finance);
  const actionLoading = useAppSelector((state) => state.admin.ui.actionLoading);

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

  const teacherQueryForRequest = teacherQuery;
  const studentQueryForRequest = studentQuery;

  useEffect(() => {
    if (isTeachersSection) {
      dispatch(fetchTeachersThunk(teacherQueryForRequest));
    }
  }, [dispatch, teacherQueryForRequest, isTeachersSection]);

  useEffect(() => {
    if (isStudentsSection) {
      dispatch(fetchStudentsThunk(studentQueryForRequest));
    }
  }, [dispatch, studentQueryForRequest, isStudentsSection]);

  useEffect(() => {
    if (isDashboardSection) {
      dispatch(fetchTeachersThunk({ ...DEFAULT_LIST_QUERY, limit: 1, page: 1 }));
      dispatch(fetchStudentsThunk({ ...DEFAULT_LIST_QUERY, limit: 1, page: 1 }));
      dispatch(fetchDarsJadvaliThunk());
      const sana = new Date().toISOString().slice(0, 10);
      dispatch(fetchAttendanceReportThunk({ sana }));
    }
  }, [dispatch, isDashboardSection]);

  useEffect(() => {
    if (isTeachersSection || isJadvalSection || isSubjectsSection) {
      dispatch(fetchSubjectsThunk());
    }
  }, [dispatch, isTeachersSection, isJadvalSection, isSubjectsSection]);

  useEffect(() => {
    if (isJadvalSection) {
      dispatch(fetchTeachersThunk({ ...DEFAULT_LIST_QUERY, limit: 100, page: 1 }));
    }
  }, [dispatch, isJadvalSection]);

  useEffect(() => {
    if (isStudentsSection || isClassroomsSection || isJadvalSection || isDashboardSection || isAttendanceSection || isFinanceSection) {
      dispatch(fetchClassroomsThunk());
    }
  }, [dispatch, isStudentsSection, isClassroomsSection, isJadvalSection, isDashboardSection, isAttendanceSection, isFinanceSection]);

  useEffect(() => {
    if (isJadvalSection) {
      dispatch(fetchVaqtOraliqlariThunk());
      dispatch(fetchDarsJadvaliThunk());
    }
  }, [dispatch, isJadvalSection]);

  useEffect(() => {
    if (isAttendanceSection) {
      const sana = new Date().toISOString().slice(0, 10);
      dispatch(fetchAttendanceReportThunk({ sana }));
    }
  }, [dispatch, isAttendanceSection]);

  useEffect(() => {
    if (!isFinanceSection) return;
    dispatch(fetchFinanceSettingsThunk());
  }, [dispatch, isFinanceSection]);

  useEffect(() => {
    if (!isFinanceSection) return;
    const timer = setTimeout(() => {
      setDebouncedFinanceSearch(financeQuery.search);
    }, FINANCE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [financeQuery.search, isFinanceSection]);

  useEffect(() => {
    if (!isFinanceSection) return;
    dispatch(fetchFinanceStudentsThunk({
      page: financeQuery.page,
      limit: financeQuery.limit,
      status: financeQuery.status,
      debtMonth: financeQuery.debtMonth,
      debtTargetMonth: financeQuery.debtTargetMonth || undefined,
      cashflowMonth: financeQuery.cashflowMonth || undefined,
      search: debouncedFinanceSearch,
      classroomId: financeQuery.classroomId === 'all' ? undefined : financeQuery.classroomId,
    }));
  }, [
    dispatch,
    isFinanceSection,
    financeQuery.page,
    financeQuery.limit,
    financeQuery.status,
    financeQuery.classroomId,
    financeQuery.debtMonth,
    financeQuery.debtTargetMonth,
    financeQuery.cashflowMonth,
    debouncedFinanceSearch,
  ]);

  useEffect(
    () => () => {
      if (confirmResolverRef.current) {
        confirmResolverRef.current(false);
        confirmResolverRef.current = null;
      }
    },
    [],
  );

  function askConfirm(message, title = 'Tasdiqlash') {
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

  async function handleDeleteTeacher(id) {
    const ok = await askConfirm('Teacher ni o`chirmoqchimisiz?', "Teacherni o'chirish");
    if (!ok) return;

    const result = await dispatch(deleteTeacherThunk(id));
    if (deleteTeacherThunk.fulfilled.match(result)) {
      toast.success('Teacher o`chirildi');
      dispatch(fetchTeachersThunk(teacherQueryForRequest));
      return;
    }
    toast.error(result.payload || 'Teacher o`chirilmadi');
  }

  async function handleDeleteStudent(id) {
    const ok = await askConfirm('Student ni o`chirmoqchimisiz?', "Studentni o'chirish");
    if (!ok) return false;

    const result = await dispatch(deleteStudentThunk(id));
    if (deleteStudentThunk.fulfilled.match(result)) {
      toast.success('Student o`chirildi');
      dispatch(fetchStudentsThunk(studentQueryForRequest));
      dispatch(fetchClassroomsThunk());
      return true;
    }

    toast.error(result.payload || 'Student o`chirilmadi');
    return false;
  }

  async function handleCreateTeacher(form) {
    const result = await dispatch(createTeacherThunk(form));
    if (createTeacherThunk.fulfilled.match(result)) {
      const teacherId = result.payload?.teacherId;
      toast.success('Teacher muvaffaqiyatli yaratildi');
      if (teacherId) {
        navigate(`/admin/teachers/${teacherId}`);
      } else {
        dispatch(fetchTeachersThunk({ ...teacherQueryForRequest, page: 1 }));
      }
      return true;
    }

    toast.error(result.payload || 'Teacher yaratilmadi');
    return false;
  }

  async function handleCreateStudent(form) {
    const result = await dispatch(createStudentThunk(form));
    if (createStudentThunk.fulfilled.match(result)) {
      const studentId = result.payload?.studentId;
      toast.success('Student muvaffaqiyatli yaratildi');
      if (studentId) {
        navigate(`/admin/students/${studentId}`);
      } else {
        dispatch(fetchStudentsThunk({ ...studentQueryForRequest, page: 1 }));
      }
      return true;
    }

    toast.error(result.payload || 'Student yaratilmadi');
    return false;
  }

  async function handleCreateSubject(name) {
    const result = await dispatch(createSubjectThunk({ name }));
    if (createSubjectThunk.fulfilled.match(result)) {
      toast.success('Fan qo`shildi');
      dispatch(fetchSubjectsThunk());
      return true;
    }

    toast.error(result.payload || 'Fan qo`shilmadi');
    return false;
  }

  async function handleDeleteSubject(id) {
    const ok = await askConfirm('Fanni o`chirmoqchimisiz?', "Fanni o'chirish");
    if (!ok) return;

    const result = await dispatch(deleteSubjectThunk(id));
    if (deleteSubjectThunk.fulfilled.match(result)) {
      toast.success('Fan o`chirildi');
      dispatch(fetchSubjectsThunk());
      return;
    }
    toast.error(result.payload || 'Fan o`chirilmadi');
  }

  async function handleCreateClassroom(payload) {
    const result = await dispatch(createClassroomThunk(payload));
    if (createClassroomThunk.fulfilled.match(result)) {
      toast.success('Sinf qo`shildi');
      dispatch(fetchClassroomsThunk());
      return true;
    }

    toast.error(result.payload || 'Sinf qo`shilmadi');
    return false;
  }

  async function handlePreviewPromoteClassroom(sourceClassroomId, targetClassroomId) {
    const result = await dispatch(previewPromoteClassroomThunk({ sourceClassroomId, targetClassroomId }));
    if (previewPromoteClassroomThunk.fulfilled.match(result)) {
      return { ok: true, data: result.payload };
    }
    return { ok: false, message: result.payload || "Ko'chirish preview olinmadi" };
  }

  async function handlePromoteClassroom(sourceClassroomId, targetClassroomId) {
    const result = await dispatch(promoteClassroomThunk({ sourceClassroomId, targetClassroomId }));
    if (promoteClassroomThunk.fulfilled.match(result)) {
      toast.success(result.payload?.message || "Sinf muvaffaqiyatli ko'chirildi");
      dispatch(fetchClassroomsThunk());
      return { ok: true, data: result.payload };
    }
    return { ok: false, message: result.payload || "Sinfni ko'chirib bo'lmadi" };
  }

  async function handlePreviewAnnualClassPromotion() {
    const result = await dispatch(previewAnnualClassPromotionThunk());
    if (previewAnnualClassPromotionThunk.fulfilled.match(result)) {
      return { ok: true, data: result.payload };
    }
    return { ok: false, message: result.payload || "Yillik o'tkazish preview olinmadi" };
  }

  async function handleRunAnnualClassPromotion(payload = {}) {
    const result = await dispatch(runAnnualClassPromotionThunk(payload));
    if (runAnnualClassPromotionThunk.fulfilled.match(result)) {
      toast.success(result.payload?.message || "Yillik sinf o'tkazish bajarildi");
      dispatch(fetchClassroomsThunk());
      return { ok: true, data: result.payload };
    }
    return { ok: false, message: result.payload || "Yillik sinf o'tkazish bajarilmadi" };
  }

  async function handleCreateVaqtOraliq(payload) {
    const result = await dispatch(createVaqtOraliqThunk(payload));
    if (createVaqtOraliqThunk.fulfilled.match(result)) {
      toast.success('Vaqt oralig`i qo`shildi');
      dispatch(fetchVaqtOraliqlariThunk());
      return true;
    }

    toast.error(result.payload || 'Vaqt oralig`i qo`shilmadi');
    return false;
  }

  async function handleDeleteVaqtOraliq(id) {
    const ok = await askConfirm("Vaqt oralig`ini o`chirmoqchimisiz?", "Vaqt oralig'ini o'chirish");
    if (!ok) return;

    const result = await dispatch(deleteVaqtOraliqThunk(id));
    if (deleteVaqtOraliqThunk.fulfilled.match(result)) {
      toast.success('Vaqt oralig`i o`chirildi');
      dispatch(fetchVaqtOraliqlariThunk());
      return;
    }
    toast.error(result.payload || 'Vaqt oralig`i o`chirilmadi');
  }

  async function handleCreateDars(payload) {
    const result = await dispatch(createDarsJadvaliThunk(payload));
    if (createDarsJadvaliThunk.fulfilled.match(result)) {
      toast.success('Dars jadvalga qo`shildi');
      dispatch(fetchDarsJadvaliThunk());
      return { ok: true };
    }

    const message = result.payload || 'Dars qo`shilmadi';
    const isConflict = /conflict|to'qnash|to`qnash|shu vaqtda|band|mavjud/i.test(message);
    if (!isConflict) toast.error(message);
    else toast.warning(message);
    return { ok: false, isConflict, message };
  }

  async function handleDeleteDars(id) {
    const ok = await askConfirm('Darsni jadvaldan o`chirmoqchimisiz?', "Darsni o'chirish");
    if (!ok) return;

    const result = await dispatch(deleteDarsJadvaliThunk(id));
    if (deleteDarsJadvaliThunk.fulfilled.match(result)) {
      toast.success('Dars jadvaldan o`chirildi');
      dispatch(fetchDarsJadvaliThunk());
      return;
    }
    toast.error(result.payload || 'Dars o`chirilmadi');
  }

  async function handleMoveDars(id, payload) {
    const result = await dispatch(updateDarsJadvaliThunk({ id, payload }));
    if (updateDarsJadvaliThunk.fulfilled.match(result)) {
      dispatch(fetchDarsJadvaliThunk());
      toast.success("Dars muvaffaqiyatli ko'chirildi");
      return { ok: true };
    }

    const message = result.payload || 'Dars ko`chirilmadi';
    const isConflict = /conflict|to'qnash|to`qnash|shu vaqtda|band|mavjud/i.test(message);
    if (!isConflict) toast.error(message);
    else toast.warning(message);
    return { ok: false, isConflict, message };
  }

  async function handleFetchAttendanceReport(params) {
    const result = await dispatch(fetchAttendanceReportThunk(params));
    if (fetchAttendanceReportThunk.rejected.match(result)) {
      toast.error(result.payload || 'Davomat hisoboti olinmadi');
    }
  }

  async function handleExportAttendance(format, params) {
    const safeFormat = format === 'xlsx' ? 'xlsx' : 'pdf';
    setExporting(safeFormat);
    try {
      const { blob, fileName } = await apiDownload({
        path: `/api/admin/davomat/hisobot/export/${safeFormat}`,
        query: params,
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const datePart = params?.sana || new Date().toISOString().slice(0, 10);
      const fallbackName = `davomat-hisobot-${datePart}.${safeFormat}`;
      const safeName = fileName && !fileName.endsWith('.bin') ? fileName : fallbackName;
      anchor.download = safeName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(`${safeFormat.toUpperCase()} fayl yuklab olindi`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting('');
    }
  }

  async function handleSaveFinanceSettings(payload) {
    const result = await dispatch(updateFinanceSettingsThunk(payload));
    if (updateFinanceSettingsThunk.fulfilled.match(result)) {
      toast.success("Tarif rejalandi");
      dispatch(fetchFinanceSettingsThunk());
      return true;
    }
    toast.error(result.payload || "Tarif saqlanmadi");
    dispatch(fetchFinanceSettingsThunk());
    return false;
  }

  async function handleOpenFinanceDetail(studentId) {
    const result = await dispatch(fetchFinanceStudentDetailThunk(studentId));
    if (fetchFinanceStudentDetailThunk.rejected.match(result)) {
      toast.error(result.payload || "Student to'lov ma'lumotlari olinmadi");
    }
  }

  async function handleCreateFinancePayment(studentId, payload) {
    const result = await dispatch(createFinancePaymentThunk({ studentId, payload }));
    if (createFinancePaymentThunk.fulfilled.match(result)) {
      toast.success("To'lov saqlandi");
      return true;
    }
    toast.error(result.payload || "To'lov saqlanmadi");
    return false;
  }

  async function handleCreateFinanceImtiyoz(studentId, payload) {
    const result = await dispatch(createFinanceImtiyozThunk({ studentId, payload }));
    if (createFinanceImtiyozThunk.fulfilled.match(result)) {
      toast.success("Imtiyoz saqlandi");
      return true;
    }
    toast.error(result.payload || "Imtiyoz saqlanmadi");
    return false;
  }

  async function handleDeactivateFinanceImtiyoz(imtiyozId, payload) {
    const result = await dispatch(deactivateFinanceImtiyozThunk({ imtiyozId, payload }));
    if (deactivateFinanceImtiyozThunk.fulfilled.match(result)) {
      toast.success("Imtiyoz bekor qilindi");
      return true;
    }
    toast.error(result.payload || "Imtiyoz bekor qilinmadi");
    return false;
  }

  async function handleExportFinanceDebtors(format) {
    const safeFormat = format === 'xlsx' ? 'xlsx' : 'pdf';
    setExporting(safeFormat);
    try {
      const { blob, fileName } = await apiDownload({
        path: `/api/admin/moliya/students/export/${safeFormat}`,
        query: {
          search: financeQuery.search || undefined,
          classroomId: financeQuery.classroomId === 'all' ? undefined : financeQuery.classroomId,
        },
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const fallbackName = `moliya-qarzdorlar.${safeFormat}`;
      anchor.download = fileName && !fileName.endsWith('.bin') ? fileName : fallbackName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(`${safeFormat.toUpperCase()} fayl yuklab olindi`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting('');
    }
  }

  const headerStats = useMemo(
    () => [
      { label: 'Teacherlar', value: teachers.total || 0 },
      { label: 'Studentlar', value: students.total || 0 },
      { label: 'Sinflar', value: classrooms.items.length || 0 },
    ],
    [teachers.total, students.total, classrooms.items.length],
  );

  return (
    <div className="space-y-6">
      {isSubjectsSection && (
        <SubjectsSection
          subjects={subjects.items}
          loading={subjects.loading}
          actionLoading={actionLoading}
          onCreateSubject={handleCreateSubject}
          onDeleteSubject={handleDeleteSubject}
        />
      )}

      {isClassroomsSection && (
        <ClassroomsSection
          classrooms={classrooms.items}
          loading={classrooms.loading}
          actionLoading={actionLoading}
          onCreateClassroom={handleCreateClassroom}
          onPreviewPromoteClassroom={handlePreviewPromoteClassroom}
          onPromoteClassroom={handlePromoteClassroom}
          onPreviewAnnualClassPromotion={handlePreviewAnnualClassPromotion}
          onRunAnnualClassPromotion={handleRunAnnualClassPromotion}
          onOpenStudentDetail={(id) => navigate(`/admin/students/${id}`)}
          onDeleteStudent={handleDeleteStudent}
        />
      )}

      {isJadvalSection && (
        <ScheduleSection
          actionLoading={actionLoading}
          classrooms={classrooms.items}
          subjects={subjects.items}
          teachers={teachers.items}
          vaqtOraliqlari={vaqtOraliqlari.items}
          darslar={darsJadvali.items}
          darslarLoading={darsJadvali.loading}
          onCreateVaqtOraliq={handleCreateVaqtOraliq}
          onDeleteVaqtOraliq={handleDeleteVaqtOraliq}
          onCreateDars={handleCreateDars}
          onDeleteDars={handleDeleteDars}
          onMoveDars={handleMoveDars}
        />
      )}

      {isAttendanceSection && (
        <AttendanceSection
          classrooms={classrooms.items}
          loading={attendance.loading}
          error={attendance.error}
          report={attendance.report}
          onFetch={handleFetchAttendanceReport}
          onExport={handleExportAttendance}
          exporting={exporting}
        />
      )}

      {isFinanceSection && (
        <FinanceSection
          classrooms={classrooms.items}
          settings={finance.settings}
          settingsMeta={finance.settingsMeta}
          studentsState={finance.students}
          studentsSummary={finance.students.summary}
          detailState={finance.detail}
          query={financeQuery}
          actionLoading={actionLoading}
          onChangeQuery={(patch) => setFinanceQuery((prev) => ({ ...prev, ...patch }))}
          onRefresh={() =>
            dispatch(fetchFinanceStudentsThunk({
              ...financeQuery,
              debtTargetMonth: financeQuery.debtTargetMonth || undefined,
              cashflowMonth: financeQuery.cashflowMonth || undefined,
              classroomId: financeQuery.classroomId === 'all' ? undefined : financeQuery.classroomId,
            }))
          }
          onSaveSettings={handleSaveFinanceSettings}
          onOpenDetail={handleOpenFinanceDetail}
          onCreatePayment={handleCreateFinancePayment}
          onCreateImtiyoz={handleCreateFinanceImtiyoz}
          onDeactivateImtiyoz={handleDeactivateFinanceImtiyoz}
          onExportDebtors={handleExportFinanceDebtors}
          exporting={exporting}
        />
      )}

      {isTeachersSection && (
        <TeachersSection
          actionLoading={actionLoading}
          subjects={subjects.items}
          classrooms={classrooms.items}
          onCreateTeacher={handleCreateTeacher}
          onCreateStudent={handleCreateStudent}
          teachers={teachers}
          teacherQuery={teacherQuery}
          setTeacherQuery={setTeacherQuery}
          onDeleteTeacher={handleDeleteTeacher}
          onOpenDetail={(id) => navigate(`/admin/teachers/${id}`)}
        />
      )}

      {isStudentsSection && (
        <StudentsSection
          actionLoading={actionLoading}
          subjects={subjects.items}
          classrooms={classrooms.items}
          onCreateTeacher={handleCreateTeacher}
          onCreateStudent={handleCreateStudent}
          students={students}
          studentQuery={studentQuery}
          setStudentQuery={setStudentQuery}
          onDeleteStudent={handleDeleteStudent}
          onOpenDetail={(id) => navigate(`/admin/students/${id}`)}
        />
      )}

      {isDashboardSection && (
        <DashboardSection
          headerStats={headerStats}
          attendanceReport={attendance.report}
          darslar={darsJadvali.items}
        />
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
