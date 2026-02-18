import { combineReducers } from '@reduxjs/toolkit';
import classroomReducer from '../classrooms/classroomSlice';
import attendanceReducer from '../attendance/attendanceSlice';
import financeReducer from '../finance/financeSlice';
import personReducer from '../person/personSlice';
import scheduleReducer from '../schedule/scheduleSlice';
import studentReducer from '../students/studentSlice';
import subjectReducer from '../subjects/subjectSlice';
import teacherReducer from '../teachers/teacherSlice';
import adminUiReducer from './adminUiSlice';

const rootReducer = combineReducers({
  teachers: teacherReducer,
  students: studentReducer,
  subjects: subjectReducer,
  classrooms: classroomReducer,
  detail: personReducer,
  schedule: scheduleReducer,
  ui: adminUiReducer,
  attendance: attendanceReducer,
  finance: financeReducer,
});

export default rootReducer;
