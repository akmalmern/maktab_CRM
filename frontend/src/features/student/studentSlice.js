import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  schedule: [],
  loading: false,
  error: null,
};

const studentSlice = createSlice({
  name: 'student',
  initialState,
  reducers: {},
});

export default studentSlice.reducer;
