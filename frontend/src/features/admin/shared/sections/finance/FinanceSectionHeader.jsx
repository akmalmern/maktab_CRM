import { Button, Card } from '../../../../../components/ui';

export default function FinanceSectionHeader({
  t,
  activeTab,
  setActiveTab,
}) {
  return (
    <Card
      title={t("Moliya bo'limi")}
      actions={
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-1">
          <Button
            size="sm"
            variant={activeTab === 'payments' ? 'indigo' : 'secondary'}
            onClick={() => setActiveTab('payments')}
          >
            {t("To'lovlar")}
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'settings' ? 'indigo' : 'secondary'}
            onClick={() => setActiveTab('settings')}
          >
            {t("Tarif sozlamalari")}
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'advances' ? 'indigo' : 'secondary'}
            onClick={() => setActiveTab('advances')}
          >
            {t('Avanslar')}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-slate-600">
        {t("Bo'limni tanlang: To'lovlar, Tarif sozlamalari yoki Avanslar.")}
      </p>
    </Card>
  );
}
