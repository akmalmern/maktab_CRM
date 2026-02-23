import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    accessToken: null,
    role: null,
    isAuthenticated: false,
  },
  reducers: {
    setCredentials(state, action) {
      state.accessToken = action.payload.accessToken || null;
      state.role = action.payload.role || null;
      state.isAuthenticated = Boolean(action.payload.accessToken);
    },
    logout(state) {
      state.accessToken = null;
      state.role = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
