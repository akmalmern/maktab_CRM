import ScheduleSection from '../shared/sections/ScheduleSection';
import { buildAdminScheduleSectionViewModel } from './adminScheduleSectionModel';
import useAdminSchedulePage from './useAdminSchedulePage';

export default function AdminScheduleWorkspace() {
  const pageState = useAdminSchedulePage();
  const sectionViewModel = buildAdminScheduleSectionViewModel(pageState);

  return <ScheduleSection viewModel={sectionViewModel} />;
}
