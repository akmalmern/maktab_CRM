import { useGetClassroomsQuery } from '../../../services/api/classroomsApi';
import { useLazyGetTeachersQuery } from '../../../services/api/peopleApi';
import { useGetSubjectsQuery } from '../../../services/api/subjectsApi';
import useScheduleTeachersDirectory from '../shared/useScheduleTeachersDirectory';

const DEFAULT_LIST_QUERY = {
  search: '',
  page: 1,
  limit: 10,
  filter: 'all',
  sort: 'name:asc',
};

export default function useAdminSchedulePage() {
  const subjectsQuery = useGetSubjectsQuery();
  const classroomsQuery = useGetClassroomsQuery();
  const [fetchTeachersPage] = useLazyGetTeachersQuery();
  const teachersState = useScheduleTeachersDirectory({
    enabled: true,
    fetchTeachersPage,
    baseQuery: DEFAULT_LIST_QUERY,
  });

  return {
    classrooms: classroomsQuery.data?.classrooms || [],
    subjects: subjectsQuery.data?.subjects || [],
    teachers: teachersState.items,
    teachersState,
  };
}
