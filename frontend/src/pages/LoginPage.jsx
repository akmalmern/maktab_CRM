import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { Button, Card, Input } from '../components/ui';
import { clearAuthError, loginThunk } from '../features/auth/authSlice';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, role } = useAppSelector((state) => state.auth);

  const [form, setForm] = useState({ username: '', password: '' });

  useEffect(() => {
    if (isAuthenticated && role) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearAuthError());
    }
  }, [error, dispatch]);

  async function onSubmit(e) {
    e.preventDefault();

    const result = await dispatch(loginThunk(form));
    if (loginThunk.fulfilled.match(result)) {
      toast.success('Xush kelibsiz');
      navigate('/', { replace: true });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Maktab CRM</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Tizimga kirish</h1>
        <p className="mt-1 text-sm text-slate-500">Dashboardga kirish uchun login qiling</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Username</label>
            <Input
              type="text"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Password</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="******"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            variant="success"
            className="w-full"
          >
            {loading ? 'Kirish...' : 'Kirish'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
