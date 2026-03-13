import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card } from '../../../../../components/ui';
import { formatDateTimeLocale, formatMonthKey, resolveLocale, sumFormat } from './financeSectionModel';
import { buildFinanceLedgerItems } from './financeLedgerModel';

function MonthChips({ months = [], maxVisible = 3 }) {
  if (!months.length) return <span className="text-slate-400">-</span>;
  const visible = months.slice(0, maxVisible);
  const hiddenCount = Math.max(0, months.length - maxVisible);
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((item) => (
        <span
          key={item}
          className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm"
        >
          {item}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

function ledgerKindBadge(item, t) {
  if (item.kind === 'PAYMENT') return <Badge variant="success">{t("To'lov")}</Badge>;
  if (item.kind === 'PAYMENT_REVERT') return <Badge variant="danger">{t("To'lov bekor")}</Badge>;
  if (item.kind === 'IMTIYOZ') return <Badge variant="info">{t('Imtiyoz')}</Badge>;
  if (item.kind === 'IMTIYOZ_REVERT') return <Badge variant="danger">{t('Imtiyoz bekor')}</Badge>;
  return <Badge>{item.kind}</Badge>;
}

export default function FinanceLedgerTimelineCard({
  detailState,
  detailImtiyozlar,
  actionLoading,
  onRevertPayment,
}) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const items = useMemo(
    () =>
      buildFinanceLedgerItems({
        transactions: detailState.transactions || [],
        imtiyozlar: detailImtiyozlar || [],
        t,
        locale,
      }),
    [detailState.transactions, detailImtiyozlar, t, locale],
  );

  return (
    <Card title={t('Amallar tarixi (ledger)')}>
      {!items.length ? (
        <p className="text-sm text-slate-500">{t("Tarix yozuvlari yo'q")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isPayment = item.kind === 'PAYMENT';
            const tx = item.meta;
            return (
              <div key={item.id} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {ledgerKindBadge(item, t)}
                      {item.status === 'AKTIV' ? (
                        <Badge variant="success">{t('Aktiv')}</Badge>
                      ) : (
                        <Badge variant="danger">{t('Bekor qilingan')}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {item.title}
                      {item.kind.startsWith('PAYMENT') && ` - ${sumFormat(item.amount, locale)} ${t("so'm")}`}
                    </p>
                    <p className="text-xs text-slate-600">{formatDateTimeLocale(item.sortDate, locale)}</p>
                    {item.periodLabel ? <p className="mt-1 text-xs text-slate-600">{t('Davr')}: {item.periodLabel}</p> : null}
                    {item.reason ? <p className="mt-1 text-xs text-slate-600">{t('Sabab')}: {item.reason}</p> : null}
                  </div>

                  {isPayment && (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={actionLoading || tx?.holat === 'BEKOR_QILINGAN' || !onRevertPayment}
                      onClick={() => onRevertPayment?.(tx.id)}
                    >
                      {t('Bekor qilish')}
                    </Button>
                  )}
                </div>

                {!!item.months?.length && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      {t('Oylar')}
                    </p>
                    <MonthChips months={item.months} maxVisible={8} />
                  </div>
                )}

                {!!item.allocations?.length && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      {t('Oylar kesimida summa')}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {item.allocations.map((allocation) => (
                        <span
                          key={`${item.id}-${allocation.key || `${allocation.yil}-${allocation.oy}`}`}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                        >
                          {(allocation.oyLabel || formatMonthKey(allocation.key || `${allocation.yil}-${String(allocation.oy).padStart(2, '0')}`, locale))}: {sumFormat(allocation.summa, locale)} {t("so'm")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.note ? (
                  <p className={`mt-2 text-xs ${item.status === 'BEKOR_QILINGAN' ? 'text-rose-600' : 'text-slate-600'}`}>
                    {t('Izoh')}: {item.note}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
