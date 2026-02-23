import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Card, StateView } from '../../components/ui';
import { useGetTeacherProfileQuery } from '../../services/api/teacherApi';

function percentFormat(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export default function TeacherHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profileQuery = useGetTeacherProfileQuery();
  const profile = profileQuery.data?.profile || null;
  const loading = profileQuery.isLoading || profileQuery.isFetching;
  const error = profileQuery.error?.message || '';

  const dashboard = profile?.dashboard || {};
  const statCardClass =
    'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50';
  const panelCardClass =
    'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50';
  const itemRowClass =
    'flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2';

  return (
    <Card title={t('Teacher panel')} subtitle={t("Bu bo'limda o'qituvchi uchun qisqa statistikalar ko'rsatiladi.")}>
      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}

      {!loading && !error && (
        <>
          <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Bugungi darslar')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {dashboard.bugungiDarslarSoni || 0}
              </p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Haftalik darslar')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {dashboard.haftalikDarslarSoni || 0}
              </p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Biriktirilgan sinflar')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {dashboard.biriktirilganSinflarSoni || 0}
              </p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Davomat (7 kun)')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {percentFormat(dashboard?.davomat7Kun?.foiz || 0)}
              </p>
            </div>
          </section>

          <section className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className={panelCardClass}>
              <p className="mb-3 text-sm font-semibold text-slate-900">{t('Oxirgi davomat sessiyalari')}</p>
              {dashboard?.oxirgiSessiyalar?.length ? (
                <div className="space-y-2 text-sm">
                  {dashboard.oxirgiSessiyalar.map((item) => (
                    <div key={item.id} className={itemRowClass}>
                      <span className="truncate text-slate-700">
                        {item.sinf} / {item.fan}
                      </span>
                      <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {item.studentlarSoni} {t('ta')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{t('Davomat tarixi topilmadi')}</p>
              )}
            </div>

            <div className={panelCardClass}>
              <p className="mb-3 text-sm font-semibold text-slate-900">{t('Oxirgi baholar')}</p>
              {dashboard?.oxirgiBaholar?.length ? (
                <div className="space-y-2 text-sm">
                  {dashboard.oxirgiBaholar.map((item) => (
                    <div key={item.id} className={itemRowClass}>
                      <span className="truncate text-slate-700">
                        {item.student} ({item.fan})
                      </span>
                      <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
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

          <div className="mb-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm text-slate-700 ring-1 ring-slate-200/50">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <p>
                <span className="text-slate-500">{t('Fan')}:</span> <b>{profile?.subject?.name || '-'}</b>
              </p>
              <p>
                <span className="text-slate-500">{t('Telefon')}:</span> <b>{profile?.phone || '-'}</b>
              </p>
            </div>
            <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-500">
              {t('Oxirgi yangilanish')}: {dashboard?.sana || '-'}
            </p>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
