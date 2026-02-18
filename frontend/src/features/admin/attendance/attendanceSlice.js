import { createSlice } from '@reduxjs/toolkit';
import { fetchAttendanceReportThunk } from './attendanceThunks';

const initialState = {
  report: null,
  loading: false,
  error: null,
};

const attendanceSlice = createSlice({
  name: 'adminAttendance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendanceReportThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceReportThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.report = action.payload;
      })
      .addCase(fetchAttendanceReportThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Davomat hisoboti olinmadi';
      });
  },
});

export default attendanceSlice.reducer;
