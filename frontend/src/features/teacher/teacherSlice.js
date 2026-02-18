import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  schedule: [],
  loading: false,
  error: null,
};

const teacherSlice = createSlice({
  name: 'teacher',
  initialState,
  reducers: {},
});

export default teacherSlice.reducer;
