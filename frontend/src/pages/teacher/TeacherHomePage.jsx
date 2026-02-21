import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Card, StateView } from '../../components/ui';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';

function percentFormat(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export default function TeacherHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest({ path: '/api/teacher/profil' });
        if (!mounted) return;
        setProfile(data.profile || null);
      } catch (err) {
        if (!mounted) return;
        setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const dashboard = profile?.dashboard || {};

  return (
    <Card title={t('Teacher panel')} subtitle={t("Bu bo'limda o'qituvchi uchun qisqa statistikalar ko'rsatiladi.")}>
      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}

      {!loading && !error && (
        <>
          <section className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">{t('Bugungi darslar')}</p>
              <p className="text-xl font-bold text-slate-900">{dashboard.bugungiDarslarSoni || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">{t('Haftalik darslar')}</p>
              <p className="text-xl font-bold text-slate-900">{dashboard.haftalikDarslarSoni || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">{t('Biriktirilgan sinflar')}</p>
              <p className="text-xl font-bold text-slate-900">{dashboard.biriktirilganSinflarSoni || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">{t('Davomat (7 kun)')}</p>
              <p className="text-xl font-bold text-slate-900">
                {percentFormat(dashboard?.davomat7Kun?.foiz || 0)}
              </p>
            </div>
          </section>

          <section className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-slate-900">{t('Oxirgi davomat sessiyalari')}</p>
              {dashboard?.oxirgiSessiyalar?.length ? (
                <div className="space-y-1 text-sm">
                  {dashboard.oxirgiSessiyalar.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                      <span>
                        {item.sinf} / {item.fan}
                      </span>
                      <span className="font-semibold">
                        {item.studentlarSoni} {t('ta')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{t('Davomat tarixi topilmadi')}</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-slate-900">{t('Oxirgi baholar')}</p>
              {dashboard?.oxirgiBaholar?.length ? (
                <div className="space-y-1 text-sm">
                  {dashboard.oxirgiBaholar.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                      <span>
                        {item.student} ({item.fan})
                      </span>
                      <span className="font-semibold">
                        {item.ball}/{item.maxBall}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{t('Baho tarixi topilmadi')}</p>
              )}
            </div>
          </section>

          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p>
              {t('Fan')}: <b>{profile?.subject?.name || '-'}</b> | {t('Telefon')}: <b>{profile?.phone || '-'}</b>
            </p>
            <p className="text-xs text-slate-500">{t('Oxirgi yangilanish')}: {dashboard?.sana || '-'}</p>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="indigo" onClick={() => navigate('/teacher/jadval')}>
          {t('Mening dars jadvalim')}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/teacher/davomat')}>
          {t('Davomat jurnali')}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/teacher/baholar')}>
          {t('Baholar')}
        </Button>
      </div>
    </Card>
  );
}
