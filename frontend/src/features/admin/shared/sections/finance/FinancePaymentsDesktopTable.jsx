import { Button } from '../../../../../components/ui';

export default function FinancePaymentsDesktopTable({
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
    <div className="hidden max-h-[60vh] overflow-auto rounded-xl border border-slate-200/80 ring-1 ring-slate-200/40 lg:block">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="bg-slate-100 text-left text-slate-600">
          <tr>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('F.I.SH')}</th>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Username')}</th>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Sinf')}</th>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Holat')}</th>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Qarz oylar')}</th>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Jami qarz')}</th>
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Amal')}</th>
          </tr>
        </thead>
        <tbody>
          {students.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 bg-white hover:bg-slate-50/60">
              <td className="px-3 py-2 font-semibold text-slate-900">{row.fullName}</td>
              <td className="px-3 py-2">{row.username}</td>
              <td className="px-3 py-2">{row.classroom}</td>
              <td className="px-3 py-2">{statusBadge(row.holat, t)}</td>
              <td className="px-3 py-2">
                <MonthChips
                  months={
                    row.qarzOylar?.length
                      ? row.qarzOylar.map((m) => formatMonthKey(m, locale))
                      : row.qarzOylarFormatted || []
                  }
                />
              </td>
              <td className="px-3 py-2 font-semibold">
                {sumFormat(row.jamiQarzSumma, locale)} {t("so'm")}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="indigo" className="min-w-20" onClick={() => openPaymentModal(row.id)}>
                    {t("To'lov")}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {!students.length && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                {t("To'lov ma'lumoti topilmadi")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
