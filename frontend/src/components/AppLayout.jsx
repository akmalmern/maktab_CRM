import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { Button } from './ui';
import { logout } from '../features/auth/authSlice';
import { apiRequest } from '../lib/apiClient';

function Icon({ path }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SidebarContent({ role, menuItems, onLogout, onNavigate }) {
  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Maktab CRM</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Panel</h1>
        <p className="mt-1 text-xs text-slate-500">Rol: {role}</p>
      </div>

      <nav className="mt-6 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin' || item.to === '/teacher' || item.to === '/student'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
                isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            <Icon path={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-8">
        <Button onClick={onLogout} variant="danger" className="w-full">
          Logout
        </Button>
      </div>
    </>
  );
}

const menuByRole = {
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: 'M3 12h8V3H3v9Zm0 9h8v-7H3v7Zm10 0h8v-9h-8v9Zm0-11h8V3h-8v7Z' },
    { to: '/admin/teachers', label: 'Teachers', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M9 7a4 4 0 1 0 0 .01M18 8a3 3 0 1 1 0-6' },
    { to: '/admin/fanlar', label: 'Fanlar Boshqaruvi', icon: 'M4 6.5A2.5 2.5 0 0 1 6.5 4H20v14H6.5A2.5 2.5 0 0 0 4 20.5M4 6.5v14M8 8h8M8 12h6' },
    { to: '/admin/students', label: 'Students', icon: 'M4 19.5V17a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2.5M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' },
    { to: '/admin/sinflar', label: 'Sinflar Boshqaruvi', icon: 'M3 7.5 12 3l9 4.5M5 10v8h14v-8M9 21h6' },
    { to: '/admin/dars-jadval', label: 'Dars Jadvali', icon: 'M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z' },
  ],
  TEACHER: [
    { to: '/teacher', label: 'Bosh sahifa', icon: 'M3 12h8V3H3v9Zm0 9h8v-7H3v7Zm10 0h8v-9h-8v9Zm0-11h8V3h-8v7Z' },
    { to: '/teacher/jadval', label: 'Mening Jadvalim', icon: 'M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z' },
  ],
  STUDENT: [
    { to: '/student', label: 'Bosh sahifa', icon: 'M3 12h8V3H3v9Zm0 9h8v-7H3v7Zm10 0h8v-9h-8v9Zm0-11h8V3h-8v7Z' },
    { to: '/student/jadval', label: 'Mening Jadvalim', icon: 'M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z' },
  ],
};

export default function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAppSelector((state) => state.auth.role);
  const menuItems = menuByRole[role] || [];
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const labelMap = useMemo(
    () => ({
      admin: 'Admin',
      teacher: "O'qituvchi",
      student: "O'quvchi",
      teachers: 'Teachers',
      fanlar: 'Fanlar Boshqaruvi',
      students: 'Students',
      sinflar: 'Sinflar Boshqaruvi',
      'dars-jadval': 'Dars Jadvali',
      jadval: 'Jadval',
      login: 'Login',
    }),
    [],
  );

  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const crumbs = [];
    segments.forEach((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      const previous = segments[index - 1];
      const isIdLike = segment.length > 12 && !labelMap[segment];
      let label = labelMap[segment] || segment;
      if (isIdLike && (previous === 'teachers' || previous === 'students')) {
        label = 'Batafsil';
      }
      crumbs.push({ path, label });
    });
    if (!crumbs.length) return [{ path: '/', label: 'Bosh sahifa' }];
    return crumbs;
  }, [labelMap, location.pathname]);

  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || 'Panel';

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  async function handleLogout() {
    try {
      await apiRequest({ path: '/api/auth/logout', method: 'POST' });
    } catch {
      // intentionally ignored
    }

    dispatch(logout());
    toast.info('Tizimdan chiqdingiz');
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-72 border-r border-slate-200 bg-white p-5 lg:block">
          <SidebarContent role={role} menuItems={menuItems} onLogout={handleLogout} />
        </aside>

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white p-5 transition-transform lg:hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-hidden={!sidebarOpen}
        >
          <SidebarContent
            role={role}
            menuItems={menuItems}
            onLogout={handleLogout}
            onNavigate={() => setSidebarOpen(false)}
          />
        </aside>

        <main className="w-full p-4 lg:p-6">
          <header className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{pageTitle}</h2>
                <nav className="mt-1 flex flex-wrap items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
                  {breadcrumbs.map((crumb, index) => (
                    <span key={crumb.path} className="inline-flex items-center gap-1">
                      {index > 0 && <span>/</span>}
                      <span>{crumb.label}</span>
                    </span>
                  ))}
                </nav>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                Menu
              </Button>
            </div>
          </header>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

