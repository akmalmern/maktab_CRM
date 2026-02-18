import AdminWorkspace from '../features/admin/shared/AdminWorkspace';

export default function DashboardPage({ focusSection = 'dashboard' }) {
  return <AdminWorkspace section={focusSection} />;
}
