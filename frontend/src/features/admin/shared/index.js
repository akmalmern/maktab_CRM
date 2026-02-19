export { default as adminReducer } from './adminReducer';
export { clearActionError } from './adminUiSlice';
export { fetchAttendanceReportThunk } from '../attendance';
export {
  fetchFinanceSettingsThunk,
  updateFinanceSettingsThunk,
  rollbackFinanceTarifThunk,
  fetchFinanceStudentsThunk,
  fetchFinanceStudentDetailThunk,
  createFinancePaymentThunk,
  createFinanceImtiyozThunk,
  deactivateFinanceImtiyozThunk,
  revertFinancePaymentThunk,
} from '../finance';

export {
  fetchTeachersThunk,
  createTeacherThunk,
  deleteTeacherThunk,
} from '../teachers';
export {
  fetchStudentsThunk,
  createStudentThunk,
  deleteStudentThunk,
} from '../students';
export {
  fetchSubjectsThunk,
  createSubjectThunk,
  deleteSubjectThunk,
} from '../subjects';
export {
  fetchClassroomsThunk,
  createClassroomThunk,
  deleteClassroomThunk,
  previewPromoteClassroomThunk,
  promoteClassroomThunk,
  previewAnnualClassPromotionThunk,
  runAnnualClassPromotionThunk,
} from '../classrooms';
export {
  fetchVaqtOraliqlariThunk,
  createVaqtOraliqThunk,
  deleteVaqtOraliqThunk,
  fetchDarsJadvaliThunk,
  createDarsJadvaliThunk,
  updateDarsJadvaliThunk,
  deleteDarsJadvaliThunk,
} from '../schedule';
export {
  fetchPersonDetailThunk,
  uploadDocumentThunk,
  updateDocumentThunk,
  deleteDocumentThunk,
  uploadAvatarThunk,
  deleteAvatarThunk,
  downloadDocumentThunk,
  resetPersonPasswordThunk,
} from '../person';
