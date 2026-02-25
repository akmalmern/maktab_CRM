import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../components/ui';

export default function ManagerHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card
      title={t('Menejer paneli')}
      subtitle={t("Bu bo'limda faqat qarzdor o'quvchilar bilan ishlaysiz va ota-ona bilan aloqa izohlarini kiritasiz.")}
    >
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("Asosiy vazifa")}</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{t("Qarzdorlar bilan aloqa va to'lov nazorati")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Jarayon')}</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{t("Izoh yozish, tarix ko'rish, tez to'lov belgilash")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50 sm:col-span-2 xl:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("Bo'lim")}</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{t("Qarzdorlar ro'yxati")}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm ring-1 ring-slate-200/50">
        <p className="text-sm text-slate-700">
          {t("Qarzdorlar bo'limiga o'tib, ota-ona bilan gaplashuv izohlarini yozing va kerak bo'lsa tezkor to'lov amallarini bajaring.")}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button variant="indigo" onClick={() => navigate('/manager/qarzdorlar')}>
          {t("Qarzdorlar ro'yxati")}
        </Button>
      </div>
    </Card>
  );
}
