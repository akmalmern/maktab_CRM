import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import {
  createClassroomThunk,
  deleteClassroomThunk,
  previewPromoteClassroomThunk,
  promoteClassroomThunk,
  runAnnualClassPromotionThunk,
} from '../classrooms/classroomThunks';
import {
  createFinancePaymentThunk,
  updateFinanceSettingsThunk,
  revertFinancePaymentThunk,
} from '../finance/financeThunks';
import {
  deleteAvatarThunk,
  deleteDocumentThunk,
  downloadDocumentThunk,
  resetPersonPasswordThunk,
  updateDocumentThunk,
  uploadAvatarThunk,
  uploadDocumentThunk,
} from '../person/personThunks';
import {
  createDarsJadvaliThunk,
  createVaqtOraliqThunk,
  deleteDarsJadvaliThunk,
  deleteVaqtOraliqThunk,
  updateDarsJadvaliThunk,
} from '../schedule/scheduleThunks';
import { createStudentThunk, deleteStudentThunk } from '../students/studentThunks';
import { createSubjectThunk, deleteSubjectThunk } from '../subjects/subjectThunks';
import { createTeacherThunk, deleteTeacherThunk } from '../teachers/teacherThunks';

const mutatingThunks = [
  createTeacherThunk,
  deleteTeacherThunk,
  createStudentThunk,
  deleteStudentThunk,
  createSubjectThunk,
  deleteSubjectThunk,
  createClassroomThunk,
  deleteClassroomThunk,
  previewPromoteClassroomThunk,
  promoteClassroomThunk,
  runAnnualClassPromotionThunk,
  createVaqtOraliqThunk,
  deleteVaqtOraliqThunk,
  createDarsJadvaliThunk,
  updateDarsJadvaliThunk,
  deleteDarsJadvaliThunk,
  uploadDocumentThunk,
  updateDocumentThunk,
  deleteDocumentThunk,
  uploadAvatarThunk,
  deleteAvatarThunk,
  downloadDocumentThunk,
  resetPersonPasswordThunk,
  createFinancePaymentThunk,
  updateFinanceSettingsThunk,
  revertFinancePaymentThunk,
];

const adminUiSlice = createSlice({
  name: 'adminUi',
  initialState: {
    actionLoading: false,
    actionError: null,
  },
  reducers: {
    clearActionError(state) {
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(isAnyOf(...mutatingThunks.map((thunk) => thunk.pending)), (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addMatcher(isAnyOf(...mutatingThunks.map((thunk) => thunk.fulfilled)), (state) => {
        state.actionLoading = false;
      })
      .addMatcher(isAnyOf(...mutatingThunks.map((thunk) => thunk.rejected)), (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || 'Amaliyot bajarilmadi';
      });
  },
});

export const { clearActionError } = adminUiSlice.actions;
export default adminUiSlice.reducer;
