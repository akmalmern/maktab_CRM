import { Button, Input } from '../../../../../components/ui';

export default function FinanceCashflowToolbar({
  t,
  query,
  onChangeQuery,
  onOpenPayroll,
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold tracking-tight text-slate-800">{t("Oylik pul oqimi (hisobot)")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1">
          <p className="text-xs text-slate-500">{t("Qaysi oy bo'yicha hisobot")}</p>
          <Input
            type="month"
            value={query.cashflowMonth || ''}
            onChange={(e) => onChangeQuery({ cashflowMonth: e.target.value || '' })}
          />
        </div>
        {typeof onOpenPayroll === 'function' && (
          <Button variant="secondary" onClick={onOpenPayroll}>
            {t("Oylik bo'limiga o'tish")}
          </Button>
        )}
      </div>
    </div>
  );
}
