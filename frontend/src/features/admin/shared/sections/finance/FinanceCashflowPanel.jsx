import { Input } from '../../../../../components/ui';

export default function FinanceCashflowPanel({
  t,
  query,
  onChangeQuery,
  cashflowPanel,
  locale,
  sumFormat,
  MiniStatCard,
}) {
  void MiniStatCard;
  return (
    <div className="mb-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 ring-1 ring-slate-200/50">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold tracking-tight text-slate-800">{t("Oylik pul oqimi (hisobot)")}</p>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1">
          <p className="text-xs text-slate-500">{t("Qaysi oy bo'yicha hisobot")}</p>
          <Input
            type="month"
            value={query.cashflowMonth || ''}
            onChange={(e) => onChangeQuery({ cashflowMonth: e.target.value || '' })}
          />
        </div>
      </div>
      <p className="mb-1 text-xs text-slate-600">
        {t("Tanlangan hisobot oyi")}: {cashflowPanel.month}
      </p>
      <p className="mb-2 text-xs text-slate-500">
        {t("Reja = kutilgan tushum, Tushum = amalda tushgan pul, Qarz = shu oy yopilmagan summa.")}
      </p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <MiniStatCard
          label={t("Oylik reja (kutilgan tushum)")}
          value={`${sumFormat(cashflowPanel.planAmount, locale)} ${t("so'm")}`}
        />
        <MiniStatCard
          label={t('Amalda tushgan pul')}
          value={`${sumFormat(cashflowPanel.collectedAmount, locale)} ${t("so'm")}`}
          tone="success"
        />
        <MiniStatCard
          label={t('Shu oy qarz summasi')}
          value={`${sumFormat(cashflowPanel.debtAmount, locale)} ${t("so'm")}`}
          tone="danger"
        />
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <p className="text-xs text-slate-500">{t('Rejaga nisbatan farq')}</p>
          <p
            className={`mt-1 text-base font-semibold ${
              cashflowPanel.diffAmount > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {sumFormat(Math.abs(cashflowPanel.diffAmount), locale)} {t("so'm")}
            {cashflowPanel.diffAmount > 0
              ? ` ${t('kam tushgan')}`
              : cashflowPanel.diffAmount < 0
                ? ` ${t("ko'p tushgan")}`
                : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
