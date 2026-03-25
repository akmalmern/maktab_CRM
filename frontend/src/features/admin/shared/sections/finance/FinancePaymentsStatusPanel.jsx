export default function FinancePaymentsStatusPanel({
  t,
  statusPanel,
  MiniStatCard,
}) {
  void MiniStatCard;
  return (
    <div className="mb-3 space-y-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {statusPanel.slice(0, 4).map((card) => (
          <MiniStatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>
      {statusPanel.length > 4 && (
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2 ring-1 ring-slate-200/40">
          <div className="mb-2 border-t border-slate-300/70 pt-2">
            <p className="text-xs font-medium text-slate-600">
              {t("Quyidagi kartalar tanlangan sinf / ro'yxat ko'rinishiga bog'liq ma'lumotlar")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {statusPanel.slice(4).map((card) => (
              <MiniStatCard key={card.label} label={card.label} value={card.value} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
