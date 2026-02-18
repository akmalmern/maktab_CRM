import { createSlice } from '@reduxjs/toolkit';
import { fetchClassroomsThunk } from './classroomThunks';

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const classroomSlice = createSlice({
  name: 'adminClassrooms',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchClassroomsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClassroomsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.classrooms || [];
      })
      .addCase(fetchClassroomsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Sinflar olinmadi';
      });
  },
});

export default classroomSlice.reducer;
