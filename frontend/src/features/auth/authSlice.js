import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const data = await apiRequest({
        path: '/api/auth/login',
        method: 'POST',
        body: credentials,
      });

      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    accessToken: null,
    role: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  },
  reducers: {
    setCredentials(state, action) {
      state.accessToken = action.payload.accessToken || null;
      state.role = action.payload.role || null;
      state.isAuthenticated = Boolean(action.payload.accessToken);
      state.error = null;
    },
    logout(state) {
      state.accessToken = null;
      state.role = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.role = action.payload.role;
        state.isAuthenticated = true;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login amalga oshmadi';
      });
  },
});

export const { setCredentials, logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
