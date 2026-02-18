import { createSlice } from '@reduxjs/toolkit';
import { fetchSubjectsThunk } from './subjectThunks';

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const subjectSlice = createSlice({
  name: 'adminSubjects',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubjectsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubjectsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.subjects || [];
      })
      .addCase(fetchSubjectsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Fanlar olinmadi';
      });
  },
});

export default subjectSlice.reducer;
