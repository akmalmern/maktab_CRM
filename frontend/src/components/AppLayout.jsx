import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import { apiRequest } from '../lib/apiClient';

export default function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await apiRequest({ path: '/api/auth/logout', method: 'POST' });
    } catch {
      // Logout API xatoligini yutamiz, local auth baribir tozalanadi.
    }

    dispatch(logout());
    toast.info('Tizimdan chiqdingiz');
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Maktab CRM</p>
            <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`
              }
            >
              Dashboard
            </NavLink>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
