export { default as personReducer } from './personSlice';
export {
  fetchPersonDetailThunk,
  uploadDocumentThunk,
  updateDocumentThunk,
  deleteDocumentThunk,
  uploadAvatarThunk,
  deleteAvatarThunk,
  downloadDocumentThunk,
  resetPersonPasswordThunk,
} from './personThunks';
