import AdminWorkspace from '../features/admin/AdminWorkspace';

export default function DashboardPage({ focusSection = 'dashboard' }) {
  return <AdminWorkspace section={focusSection} />;
}
