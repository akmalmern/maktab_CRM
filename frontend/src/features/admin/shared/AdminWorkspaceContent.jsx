import {
  ArchiveSection,
  AttendanceSection,
  ClassroomsSection,
  DashboardSection,
  FinanceSection,
  PayrollSection,
  ScheduleSection,
  StudentsSection,
  SubjectsSection,
  TeachersSection,
} from './sections';

export default function AdminWorkspaceContent({
  section,
  navigate,
  handleDeleteStudent,
  classrooms,
  subjects,
  teachers,
  exporting,
  handleExportAttendance,
  financeSettings,
  financeSettingsMeta,
  financeStudentsState,
  financeDetailState,
  financeQuery,
  financeActionLoading,
  handleFinanceQueryChange,
  financeStudentsQuery,
  handleSaveFinanceSettings,
  handleOpenFinanceDetail,
  handleCreateFinancePayment,
  handleCreateFinanceImtiyoz,
  handleDeactivateFinanceImtiyoz,
  handleRollbackFinanceTarif,
  handleRevertFinancePayment,
  handleExportFinanceDebtors,
  peopleMutationLoading,
  handleCreateTeacher,
  handleCreateStudent,
  teacherQuery,
  setTeacherQuery,
  studentQuery,
  setStudentQuery,
}) {
  if (section === 'subjects') {
    return <SubjectsSection />;
  }

  if (section === 'classrooms') {
    return (
      <ClassroomsSection
        onOpenStudentDetail={(id) => navigate(`/admin/students/${id}`)}
        onDeleteStudent={handleDeleteStudent}
      />
    );
  }

  if (section === 'jadval') {
    return (
      <ScheduleSection
        classrooms={classrooms.items}
        subjects={subjects.items}
        teachers={teachers.items}
        teachersState={teachers}
      />
    );
  }

  if (section === 'attendance') {
    return (
      <AttendanceSection
        classrooms={classrooms.items}
        onExport={handleExportAttendance}
        exporting={exporting}
      />
    );
  }

  if (section === 'finance') {
    return (
      <FinanceSection
        classrooms={classrooms.items}
        settings={financeSettings}
        settingsMeta={financeSettingsMeta}
        studentsState={financeStudentsState}
        studentsSummary={financeStudentsState.summary}
        detailState={financeDetailState}
        query={financeQuery}
        actionLoading={financeActionLoading}
        onChangeQuery={handleFinanceQueryChange}
        onRefresh={() => financeStudentsQuery.refetch()}
        onSaveSettings={handleSaveFinanceSettings}
        onOpenDetail={handleOpenFinanceDetail}
        onCreatePayment={handleCreateFinancePayment}
        onCreateImtiyoz={handleCreateFinanceImtiyoz}
        onDeactivateImtiyoz={handleDeactivateFinanceImtiyoz}
        onRollbackTarif={handleRollbackFinanceTarif}
        onRevertPayment={handleRevertFinancePayment}
        onExportDebtors={handleExportFinanceDebtors}
        onOpenPayroll={() => navigate('/admin/oylik')}
        exporting={exporting}
      />
    );
  }

  if (section === 'payroll') {
    return <PayrollSection />;
  }

  if (section === 'teachers') {
    return (
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
    );
  }

  if (section === 'students') {
    return (
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
    );
  }

  if (section === 'archive') {
    return (
      <ArchiveSection
        subjects={subjects.items}
        classrooms={classrooms.items}
        onOpenTeacherDetail={(id) => navigate(`/admin/teachers/${id}`)}
        onOpenStudentDetail={(id) => navigate(`/admin/students/${id}`)}
      />
    );
  }

  return <DashboardSection />;
}
