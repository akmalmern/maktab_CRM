import { createSlice } from '@reduxjs/toolkit';
import { fetchDarsJadvaliThunk, fetchVaqtOraliqlariThunk } from './scheduleThunks';

const initialState = {
  vaqtOraliqlari: {
    items: [],
    loading: false,
    error: null,
  },
  darsJadvali: {
    items: [],
    loading: false,
    error: null,
  },
};

const scheduleSlice = createSlice({
  name: 'adminSchedule',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVaqtOraliqlariThunk.pending, (state) => {
        state.vaqtOraliqlari.loading = true;
        state.vaqtOraliqlari.error = null;
      })
      .addCase(fetchVaqtOraliqlariThunk.fulfilled, (state, action) => {
        state.vaqtOraliqlari.loading = false;
        state.vaqtOraliqlari.items = action.payload.vaqtOraliqlari || [];
      })
      .addCase(fetchVaqtOraliqlariThunk.rejected, (state, action) => {
        state.vaqtOraliqlari.loading = false;
        state.vaqtOraliqlari.error = action.payload || 'Vaqt oraliqlari olinmadi';
      })
      .addCase(fetchDarsJadvaliThunk.pending, (state) => {
        state.darsJadvali.loading = true;
        state.darsJadvali.error = null;
      })
      .addCase(fetchDarsJadvaliThunk.fulfilled, (state, action) => {
        state.darsJadvali.loading = false;
        state.darsJadvali.items = action.payload.darslar || [];
      })
      .addCase(fetchDarsJadvaliThunk.rejected, (state, action) => {
        state.darsJadvali.loading = false;
        state.darsJadvali.error = action.payload || 'Dars jadvali olinmadi';
      });
  },
});

export default scheduleSlice.reducer;
