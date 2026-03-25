import { Badge, Button, Card } from '../../../../../components/ui';
import { FinanceTransactionsTable } from '../../../../shared/finance/components/FinanceTransactionsTable';
import FinanceLedgerTimelineCard from './FinanceLedgerTimelineCard';
import { formatDateTimeLocale, paymentTypeLabel } from './financeSectionModel';

export default function FinancePaymentHistoryTab({
  t,
  locale,
  actionLoading,
  settingsMeta,
  onRollbackTarif,
  detailState,
  detailImtiyozlar,
  onRevertPayment,
  sumFormat,
}) {
  return (
    <>
      {!!settingsMeta?.tarifHistory?.length && (
        <Card title={t('Tarif versiyalari')}>
          <div className="space-y-2">
            {settingsMeta.tarifHistory.slice(0, 5).map((tarif) => {
              const isRollbackDisabled = actionLoading || !onRollbackTarif || tarif.holat === 'AKTIV';
              return (
                <div
                  key={tarif.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {sumFormat(tarif.oylikSumma)} / {sumFormat(tarif.yillikSumma)} {t("so'm")}
                    </p>
                    <p className="text-xs text-slate-600">
                      {tarif.boshlanishSana ? new Date(tarif.boshlanishSana).toLocaleDateString(locale || 'uz-UZ') : '-'} | {tarif.holat === 'AKTIV' ? t('Aktiv') : tarif.holat === 'BEKOR_QILINGAN' ? t('Bekor qilingan') : tarif.holat}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {tarif.holat === 'AKTIV' ? (
                      <Badge variant="success">{t('Aktiv')}</Badge>
                    ) : (
                      <Badge>{tarif.holat || '-'}</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isRollbackDisabled}
                      onClick={() => onRollbackTarif?.(tarif.id)}
                    >
                      {t("Orqaga qaytarish")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <FinanceTransactionsTable
        transactions={detailState.transactions || []}
        loading={detailState.loading}
        error={detailState.error}
        actionLoading={actionLoading}
        onRevertPayment={onRevertPayment}
        paymentTypeLabel={(type) => paymentTypeLabel(type, t)}
        formatMoney={(value) => `${sumFormat(value)} ${t("so'm")}`}
        formatDateTime={(value) => formatDateTimeLocale(value, locale || 'uz-UZ')}
      />
      <FinanceLedgerTimelineCard
        detailState={detailState}
        detailImtiyozlar={detailImtiyozlar}
        actionLoading={actionLoading}
        onRevertPayment={onRevertPayment}
      />
    </>
  );
}
