import {
  Badge,
  Button,
  StateView,
  StatusBadge,
} from '../../../../components/ui';
import { MonthChips } from './MonthChips';

export function ManagerDebtorsTable({
  t,
  locale,
  studentsState,
  formatMoney,
  formatMonthKey,
  openPaymentHistory,
  openModal,
}) {
  if (studentsState.loading) return <StateView type="loading" />;
  if (!studentsState.loading && studentsState.error) {
    return <StateView type="error" description={studentsState.error} />;
  }
  if (!studentsState.loading && !studentsState.error && !studentsState.items.length) {
    return <StateView type="empty" description={t("Qarzdor o'quvchi topilmadi.")} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          {t('Jami')}: {studentsState.total || 0}
        </span>
      </div>
      <div className="max-h-[60vh] overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-200/50">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t("O'quvchi")}</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Sinf')}</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Username')}</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Holat')}</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Qarz oylar')}</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Jami qarz')}</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Amal')}</th>
            </tr>
          </thead>
          <tbody>
            {studentsState.items.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 align-top bg-white hover:bg-slate-50/60">
                <td className="px-3 py-2">
                  <p className="font-semibold text-slate-900">{row.fullName}</p>
                  <p className="text-xs text-slate-500">@{row.username}</p>
                </td>
                <td className="px-3 py-2">{row.classroom}</td>
                <td className="px-3 py-2">{row.username}</td>
                <td className="px-3 py-2">
                  <StatusBadge
                    domain="financeStudent"
                    value={Number(row.jamiQarzSumma || 0) > 0 ? 'QARZDOR' : 'TOLANGAN'}
                    className="shadow-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <p className="mb-1">
                    <Badge variant="danger" className="shadow-none">
                      {row.qarzOylarSoni} {t('ta')}
                    </Badge>
                  </p>
                  <MonthChips
                    items={(row.qarzOylar || []).map((key) => formatMonthKey(key, locale))}
                  />
                </td>
                <td className="px-3 py-2 font-semibold text-rose-700">
                  {formatMoney(row.jamiQarzSumma, locale, t)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="indigo"
                      className="min-w-24"
                      onClick={() => openPaymentHistory(row)}
                    >
                      {t("To'lov")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="min-w-20"
                      onClick={() => openModal(row)}
                    >
                      {t('Izohlar')}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
