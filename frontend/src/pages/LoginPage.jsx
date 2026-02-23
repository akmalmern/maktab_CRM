import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Button, Card, Input } from '../components/ui';
import { setCredentials } from '../features/auth/authSlice';
import { useLoginAuthMutation } from '../services/api/authApi';

export default function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAppSelector((state) => state.auth);
  const [loginAuth, loginAuthState] = useLoginAuthMutation();

  const [form, setForm] = useState({ username: '', password: '' });

  useEffect(() => {
    if (isAuthenticated && role) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  async function onSubmit(e) {
    e.preventDefault();

    try {
      const data = await loginAuth(form).unwrap();
      dispatch(
        setCredentials({
          accessToken: data?.accessToken,
          role: data?.role,
        }),
      );
      toast.success(t('Xush kelibsiz'));
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error?.message || t('Login amalga oshmadi'));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-2 flex justify-end">
          <LanguageSwitcher compact />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('Maktab CRM')}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{t('Tizimga kirish')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('Dashboardga kirish uchun login qiling')}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">{t('Username')}</label>
            <Input
              type="text"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">{t('Password')}</label>
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
            disabled={loginAuthState.isLoading}
            variant="success"
            className="w-full"
          >
            {loginAuthState.isLoading ? t('Kirish...') : t('Kirish')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
