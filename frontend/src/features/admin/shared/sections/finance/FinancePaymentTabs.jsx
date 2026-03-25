import { Button } from '../../../../../components/ui';

export default function FinancePaymentTabs({
  t,
  paymentModalTab,
  setPaymentModalTab,
  detailImtiyozlar,
  detailState,
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-2 ring-1 ring-slate-200/50">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={paymentModalTab === 'payment' ? 'indigo' : 'secondary'} onClick={() => setPaymentModalTab('payment')}>
          {t("To'lov")}
        </Button>
        <Button size="sm" variant={paymentModalTab === 'imtiyoz' ? 'indigo' : 'secondary'} onClick={() => setPaymentModalTab('imtiyoz')}>
          {t('Imtiyoz')}
          {!!detailImtiyozlar.length && ` (${detailImtiyozlar.length})`}
        </Button>
        <Button size="sm" variant={paymentModalTab === 'history' ? 'indigo' : 'secondary'} onClick={() => setPaymentModalTab('history')}>
          {t('Tarix')}
          {!!detailState.transactions?.length && ` (${detailState.transactions.length})`}
        </Button>
      </div>
    </div>
  );
}
