import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Card, StateView } from '../../components/ui';
import { useGetStudentProfileQuery } from '../../services/api/studentApi';

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
  const profileQuery = useGetStudentProfileQuery();
  const profile = profileQuery.data?.profile || null;
  const loading = profileQuery.isLoading || profileQuery.isFetching;
  const error = profileQuery.error?.message || '';

  const debt = profile?.moliya;
  const dashboard = profile?.dashboard || {};
  const davomat30 = dashboard?.davomat || {};
  const locale = resolveLocale(i18n.language);
  const hasDebt = debt?.holat === 'QARZDOR' && Number(debt?.qarzOylarSoni || 0) > 0;
  const debtTitle = hasDebt ? t("Qarzdorlik ogohlantirishi") : t("To'lov holati");
  const debtText = hasDebt
    ? debt?.message || `${debt?.qarzOylarFormatted?.join(', ') || ''} ${t("oylar uchun qarzdorligingiz mavjud.")}`
    : t("Sizda qarzdorlik yo'q. Barcha oylar to'langan.");
  const statCardClass =
    'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50';
  const panelCardClass =
    'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50';
  const itemRowClass =
    'flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2';

  return (
    <Card title={t('Student panel')} subtitle={t("Bu bo'limda student o'z jadvali va davomat ma'lumotlarini ko'radi.")}>
      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}
      {!loading && !error && (
        <>
          <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Davomat (30 kun)')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {percentFormat(davomat30?.foiz)}
              </p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Oxirgi 30 kun darslar')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{davomat30?.jami || 0}</p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Qarzdor oylar')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{debt?.qarzOylarSoni || 0}</p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Jami qarz')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {sumFormat(debt?.jamiQarzSumma, locale)} {t("so'm")}
              </p>
            </div>
          </section>

          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm shadow-sm ring-1 ${
              hasDebt
                ? 'border-rose-200 bg-rose-50/90 text-rose-800 ring-rose-100'
                : 'border-emerald-200 bg-emerald-50/90 text-emerald-800 ring-emerald-100'
            }`}
          >
            <p className="font-semibold">{debtTitle}</p>
            <p>{debtText}</p>
            {hasDebt && (
              <p className="mt-2 border-t border-current/15 pt-2 text-xs">
                {t('Qarz oylar soni')}: <b>{debt?.qarzOylarSoni}</b> | {t('Jami qarz')}:{' '}
                <b>
                  {sumFormat(debt?.jamiQarzSumma, locale)} {t("so'm")}
                </b>
              </p>
            )}
          </div>

          <section className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className={panelCardClass}>
              <p className="mb-3 text-sm font-semibold text-slate-900">{t('Oxirgi 5 baho')}</p>
              {dashboard?.oxirgiBaholar?.length ? (
                <div className="space-y-2 text-sm">
                  {dashboard.oxirgiBaholar.map((item) => (
                    <div key={item.id} className={itemRowClass}>
                      <span className="truncate text-slate-700">
                        {item.fan} ({item.turi})
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

            <div className={panelCardClass}>
              <p className="mb-3 text-sm font-semibold text-slate-900">{t("Oxirgi to'lovlar")}</p>
              {dashboard?.oxirgiTolovlar?.length ? (
                <div className="space-y-2 text-sm">
                  {dashboard.oxirgiTolovlar.map((item) => (
                    <div key={item.id} className={itemRowClass}>
                      <span className="truncate text-slate-700">{t(item.turi, { defaultValue: item.turi })}</span>
                      <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {sumFormat(item.summa, locale)} {t("so'm")}
                      </span>
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
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
