import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';

const STORAGE_KEY = 'crm_auth';

function loadAuthState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, role: null };

    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed.accessToken || null,
      role: parsed.role || null,
    };
  } catch {
    return { accessToken: null, role: null };
  }
}

function persistAuthState(state) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: state.accessToken,
      role: state.role,
    }),
  );
}

const persisted = loadAuthState();

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
    accessToken: persisted.accessToken,
    role: persisted.role,
    isAuthenticated: Boolean(persisted.accessToken),
    loading: false,
    error: null,
  },
  reducers: {
    setCredentials(state, action) {
      state.accessToken = action.payload.accessToken || null;
      state.role = action.payload.role || null;
      state.isAuthenticated = Boolean(action.payload.accessToken);
      state.error = null;
      persistAuthState(state);
    },
    logout(state) {
      state.accessToken = null;
      state.role = null;
      state.isAuthenticated = false;
      state.error = null;
      persistAuthState(state);
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
        persistAuthState(state);
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login amalga oshmadi';
      });
  },
});

export const { setCredentials, logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
