import { Button, StateView } from '../../../../../components/ui';

export default function FinancePaymentsMobileList({
  t,
  students,
  locale,
  sumFormat,
  openPaymentModal,
  MonthChips,
  statusBadge,
  formatMonthKey,
}) {
  void MonthChips;
  return (
    <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1 lg:hidden">
      {students.map((row) => (
        <div
          key={row.id}
          className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-slate-200/50"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900">{row.fullName}</p>
              <p className="text-xs text-slate-500">@{row.username}</p>
              <p className="mt-1 text-xs text-slate-600">{row.classroom || '-'}</p>
            </div>
            {statusBadge(row.holat, t)}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
              <p className="text-xs text-slate-500">{t('Qarz oylar')}</p>
              <div className="mt-1">
                <MonthChips
                  months={
                    row.qarzOylar?.length
                      ? row.qarzOylar.map((m) => formatMonthKey(m, locale))
                      : row.qarzOylarFormatted || []
                  }
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
              <p className="text-xs text-slate-500">{t('Jami qarz')}</p>
              <p className="mt-1 font-semibold text-slate-900">
                {sumFormat(row.jamiQarzSumma, locale)} {t("so'm")}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <Button size="sm" variant="indigo" onClick={() => openPaymentModal(row.id)} className="w-full">
              {t("To'lov")}
            </Button>
          </div>
        </div>
      ))}
      {!students.length && <StateView type="empty" description={t("To'lov ma'lumoti topilmadi")} />}
    </div>
  );
}
