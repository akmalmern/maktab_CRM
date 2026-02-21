import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Card, StateView } from '../../components/ui';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';

function resolveLocale(language) {
  if (language === 'ru') return 'ru-RU';
  if (language === 'en') return 'en-US';
  return 'uz-UZ';
}

function sumFormat(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

function percentFormat(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export default function StudentHomePage() {
  const { t, i18n } = useTranslation();
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
        const data = await apiRequest({ path: '/api/student/profil' });
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

  const debt = profile?.moliya;
  const dashboard = profile?.dashboard || {};
  const davomat30 = dashboard?.davomat || {};
  const locale = resolveLocale(i18n.language);
  const hasDebt = debt?.holat === 'QARZDOR' && Number(debt?.qarzOylarSoni || 0) > 0;
  const debtTitle = hasDebt ? t("Qarzdorlik ogohlantirishi") : t("To'lov holati");
  const debtText = hasDebt
    ? debt?.message || `${debt?.qarzOylarFormatted?.join(', ') || ''} ${t("oylar uchun qarzdorligingiz mavjud.")}`
    : t("Sizda qarzdorlik yo'q. Barcha oylar to'langan.");

  return (
    <Card title={t('Student panel')} subtitle={t("Bu bo'limda student o'z jadvali va davomat ma'lumotlarini ko'radi.")}>
      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}
      {!loading && !error && (
        <>
          <section className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">{t('Davomat (30 kun)')}</p>
              <p className="text-xl font-bold text-slate-900">{percentFormat(davomat30?.foiz)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">{t('Oxirgi 30 kun darslar')}</p>
              <p className="text-xl font-bold text-slate-900">{davomat30?.jami || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">{t('Qarzdor oylar')}</p>
              <p className="text-xl font-bold text-slate-900">{debt?.qarzOylarSoni || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">{t('Jami qarz')}</p>
              <p className="text-xl font-bold text-slate-900">
                {sumFormat(debt?.jamiQarzSumma, locale)} {t("so'm")}
              </p>
            </div>
          </section>

          <div
            className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
              hasDebt
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <p className="font-semibold">{debtTitle}</p>
            <p>{debtText}</p>
            {hasDebt && (
              <p className="mt-1 text-xs">
                {t('Qarz oylar soni')}: <b>{debt?.qarzOylarSoni}</b> | {t('Jami qarz')}: <b>{sumFormat(debt?.jamiQarzSumma, locale)} {t("so'm")}</b>
              </p>
            )}
          </div>

          <section className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-slate-900">{t('Oxirgi 5 baho')}</p>
              {dashboard?.oxirgiBaholar?.length ? (
                <div className="space-y-1 text-sm">
                  {dashboard.oxirgiBaholar.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                      <span>
                        {item.fan} ({item.turi})
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

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-slate-900">{t("Oxirgi to'lovlar")}</p>
              {dashboard?.oxirgiTolovlar?.length ? (
                <div className="space-y-1 text-sm">
                  {dashboard.oxirgiTolovlar.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                      <span>{t(item.turi, { defaultValue: item.turi })}</span>
                      <span className="font-semibold">{sumFormat(item.summa, locale)} {t("so'm")}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{t("To'lov tarixi topilmadi")}</p>
              )}
            </div>
          </section>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="indigo" onClick={() => navigate('/student/jadval')}>
          {t('Mening jadvalim')}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/student/davomat')}>
          {t('Mening davomatim')}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/student/baholar')}>
          {t('Mening baholarim')}
        </Button>
      </div>
    </Card>
  );
}
