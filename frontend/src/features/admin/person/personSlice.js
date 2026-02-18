import { createSlice } from '@reduxjs/toolkit';
import { fetchPersonDetailThunk } from './personThunks';

const initialState = {
  type: null,
  id: null,
  data: null,
  loading: false,
  error: null,
};

const personSlice = createSlice({
  name: 'adminPersonDetail',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPersonDetailThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPersonDetailThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.type = action.payload.type;
        state.id = action.payload.id;
        state.data = action.payload.data;
      })
      .addCase(fetchPersonDetailThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Profil ma`lumoti olinmadi';
      });
  },
});

export default personSlice.reducer;
