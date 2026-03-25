import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  useCreateClassroomMutation,
  useGetClassroomsMetaQuery,
  useGetClassroomsQuery,
} from '../../../services/api/classroomsApi';
import {
  buildAcademicYearOptions,
  collapseDraftName,
  getPreferredAcademicYear,
} from './models/classroomViewModel';

export default function useClassroomsData({ t }) {
  const classroomsQuery = useGetClassroomsQuery();
  const classroomMetaQuery = useGetClassroomsMetaQuery();
  const [createClassroom, createClassroomState] = useCreateClassroomMutation();

  const classrooms = useMemo(
    () => classroomsQuery.data?.classrooms || [],
    [classroomsQuery.data],
  );
  const meta = classroomMetaQuery.data?.meta || null;
  const academicYearOptions = useMemo(
    () => buildAcademicYearOptions(meta, classrooms),
    [meta, classrooms],
  );

  const [name, setName] = useState('');
  const [academicYearDraft, setAcademicYearDraft] = useState('');
  const preferredAcademicYear = useMemo(
    () => getPreferredAcademicYear(meta, classrooms),
    [meta, classrooms],
  );
  const academicYear = useMemo(() => {
    if (!academicYearOptions.length) return '';
    if (academicYearDraft && academicYearOptions.includes(academicYearDraft)) {
      return academicYearDraft;
    }
    return preferredAcademicYear;
  }, [academicYearDraft, academicYearOptions, preferredAcademicYear]);

  async function handleCreateClassroom(event) {
    event.preventDefault();
    const draftName = collapseDraftName(name);
    setName(draftName);
    if (!draftName) {
      toast.error(t('Sinf nomini kiriting'));
      return false;
    }
    if (!academicYear) {
      toast.error(t("O'quv yilini tanlang"));
      return false;
    }

    try {
      await createClassroom({ name: draftName, academicYear }).unwrap();
      toast.success(t("Sinf qo`shildi"));
      setName('');
      return true;
    } catch (error) {
      toast.error(error?.message || t("Sinf qo`shilmadi"));
      return false;
    }
  }

  function handleNameBlur(value) {
    setName(collapseDraftName(value));
  }

  return {
    classrooms,
    meta,
    name,
    academicYear,
    academicYearOptions,
    classroomsState: {
      loading: classroomsQuery.isLoading || classroomsQuery.isFetching,
      error: classroomsQuery.error?.message || null,
    },
    createLoading: createClassroomState.isLoading,
    onNameChange: setName,
    onNameBlur: handleNameBlur,
    onAcademicYearChange: setAcademicYearDraft,
    onSelectNextAcademicYear: () =>
      setAcademicYearDraft(meta?.nextAcademicYear || academicYear),
    onCreateClassroom: handleCreateClassroom,
  };
}
