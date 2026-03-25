import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useCreateManagerDebtorNoteMutation,
  useGetManagerDebtorNotesQuery,
} from '../../../services/api/managerApi';
import { normalizeManagerNotesState } from '../../shared/finance/financeReadModel';
import { NOTES_PAGE_LIMIT } from './managerDebtorsModel';

export default function useManagerDebtorNotes({ t }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [notesPage, setNotesPage] = useState(1);
  const [noteForm, setNoteForm] = useState({ izoh: '', promisedPayDate: '' });
  const [createManagerNote, createManagerNoteState] = useCreateManagerDebtorNoteMutation();
  const notesQuery = useGetManagerDebtorNotesQuery(
    {
      studentId: selectedStudent?.id,
      page: notesPage,
      limit: NOTES_PAGE_LIMIT,
    },
    {
      skip: !modalOpen || !selectedStudent?.id,
    },
  );

  const notesState = normalizeManagerNotesState({
    data: notesQuery.data,
    loading:
      notesQuery.isLoading ||
      notesQuery.isFetching ||
      (modalOpen && Boolean(selectedStudent?.id) && notesQuery.isUninitialized),
    error: notesQuery.error,
    errorMessage: notesQuery.error ? t("Izohlar olinmadi") : '',
  });

  function loadNotes(studentId, page = 1) {
    if (!selectedStudent || String(studentId) !== String(selectedStudent.id)) return;
    if (Number(page) === Number(notesPage)) {
      notesQuery.refetch();
      return;
    }
    setNotesPage(Number(page) || 1);
  }

  function openModal(student) {
    setSelectedStudent(student);
    setNotesPage(1);
    setNoteForm({ izoh: '', promisedPayDate: '' });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedStudent(null);
    setNotesPage(1);
    setNoteForm({ izoh: '', promisedPayDate: '' });
  }

  async function handleSaveNote(event) {
    event.preventDefault();
    if (!selectedStudent) return;
    const izoh = noteForm.izoh.trim();
    if (!izoh) {
      toast.warning(t("Izoh maydoni bo'sh bo'lishi mumkin emas"));
      return;
    }

    try {
      await createManagerNote({
        studentId: selectedStudent.id,
        payload: {
          izoh,
          promisedPayDate: noteForm.promisedPayDate || undefined,
        },
      }).unwrap();
      toast.success(t('Izoh saqlandi'));
      setNotesPage(1);
      setNoteForm({ izoh: '', promisedPayDate: '' });
    } catch (error) {
      toast.error(error?.message || t("Izoh saqlanmadi"));
    }
  }

  return {
    modalOpen,
    selectedStudent,
    noteForm,
    setNoteForm,
    notesState,
    savingNote: createManagerNoteState.isLoading,
    loadNotes,
    openModal,
    closeModal,
    handleSaveNote,
  };
}
