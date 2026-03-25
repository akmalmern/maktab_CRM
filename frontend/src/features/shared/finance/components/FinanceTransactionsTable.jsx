import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, StateView, StatusBadge } from '../../../../components/ui';

export function FinanceTransactionsTable({
  transactions = [],
  loading = false,
  error = '',
  actionLoading = false,
  onRevertPayment,
  paymentTypeLabel,
  formatMoney,
  formatDateTime,
}) {
  const { t } = useTranslation();

  return (
    <Card title={t("To'lov tranzaksiyalari")}>
      {loading && <StateView type="loading" />}
      {!loading && error && <StateView type="error" description={error} />}
      {!loading && !error && !transactions.length && (
        <StateView type="empty" description={t("To'lov tarixi yo'q.")} />
      )}
      {!loading && !error && transactions.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-200/50">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">
                  {t('Sana')}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">
                  {t('Turi')}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">
                  {t('Holat')}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">
                  {t('Summa')}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">
                  {t('Qoplangan oylar')}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">
                  {t('Amal')}
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-t border-slate-100 bg-white hover:bg-slate-50/60"
                >
                  <td className="px-3 py-2">{formatDateTime(tx.tolovSana || tx.createdAt)}</td>
                  <td className="px-3 py-2">{paymentTypeLabel(tx.turi)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      domain="financeTransaction"
                      value={tx.holat}
                      className="shadow-none"
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-900">
                    {formatMoney(tx.summa)}
                  </td>
                  <td className="px-3 py-2">
                    {(tx.qoplanganOylarFormatted || []).join(', ') || '-'}
                  </td>
                  <td className="px-3 py-2">
                    {tx.holat === 'BEKOR_QILINGAN' ? (
                      <Badge variant="secondary">{t('Bekor qilingan')}</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => onRevertPayment?.(tx.id)}
                        disabled={actionLoading || !onRevertPayment}
                      >
                        {t('Bekor qilish')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
