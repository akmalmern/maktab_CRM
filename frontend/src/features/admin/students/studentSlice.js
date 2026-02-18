import { createSlice } from '@reduxjs/toolkit';
import { fetchStudentsThunk } from './studentThunks';

const initialState = {
  items: [],
  page: 1,
  limit: 10,
  total: 0,
  pages: 0,
  loading: false,
  error: null,
};

const studentSlice = createSlice({
  name: 'adminStudents',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.students || [];
        state.page = action.payload.page || 1;
        state.limit = action.payload.limit || 10;
        state.total = action.payload.total || 0;
        state.pages = action.payload.pages || 0;
      })
      .addCase(fetchStudentsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Studentlar olinmadi';
      });
  },
});

export default studentSlice.reducer;
