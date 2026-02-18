import { createSlice } from '@reduxjs/toolkit';
import { fetchTeachersThunk } from './teacherThunks';

const initialState = {
  items: [],
  page: 1,
  limit: 10,
  total: 0,
  pages: 0,
  loading: false,
  error: null,
};

const teacherSlice = createSlice({
  name: 'adminTeachers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeachersThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeachersThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.teachers || [];
        state.page = action.payload.page || 1;
        state.limit = action.payload.limit || 10;
        state.total = action.payload.total || 0;
        state.pages = action.payload.pages || 0;
      })
      .addCase(fetchTeachersThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Teacherlar olinmadi';
      });
  },
});

export default teacherSlice.reducer;
