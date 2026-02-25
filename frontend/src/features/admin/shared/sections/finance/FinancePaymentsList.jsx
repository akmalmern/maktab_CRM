import { Button, Card, Input, Select, StateView } from '../../../../../components/ui';
import FinanceCashflowPanel from './FinanceCashflowPanel';

export default function FinancePaymentsList({
  t,
  query,
  onChangeQuery,
  classrooms,
  studentsState,
  students,
  statusPanel,
  cashflowPanel,
  locale,
  sumFormat,
  exporting,
  onExportDebtors,
  isClassroomSelected,
  openPaymentModal,
  MiniStatCard,
  MonthChips,
  statusBadge,
  formatMonthKey,
}) {
  void MonthChips;
  return (
    <Card title={t("To'lovlar ro'yxati")}>
      <FinanceCashflowPanel
        t={t}
        query={query}
        onChangeQuery={onChangeQuery}
        cashflowPanel={cashflowPanel}
        locale={locale}
        sumFormat={sumFormat}
        MiniStatCard={MiniStatCard}
      />

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

      <div className="mb-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 ring-1 ring-slate-200/50">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
          <Input
            type="text"
            value={query.search}
            onChange={(e) => onChangeQuery({ search: e.target.value, page: 1 })}
            placeholder={t("Ism yoki username...")}
          />
          <Select value={query.status} onChange={(e) => onChangeQuery({ status: e.target.value, page: 1 })}>
            <option value="ALL">{t('Hammasi')}</option>
            <option value="QARZDOR">{t('Faqat qarzdor')}</option>
            <option value="TOLAGAN">{t("Faqat to'lagan")}</option>
          </Select>
          <Select value={query.classroomId} onChange={(e) => onChangeQuery({ classroomId: e.target.value, page: 1 })}>
            <option value="all">{t('Barcha sinflar')}</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.academicYear})
              </option>
            ))}
          </Select>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => onExportDebtors('xlsx')}
              disabled={exporting === 'xlsx'}
              className="w-full"
            >
              {t('Qarzdorlar Excel')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onExportDebtors('pdf')}
              disabled={exporting === 'pdf'}
              className="w-full"
            >
              {t('Qarzdorlar PDF')}
            </Button>
          </div>
        </div>
      </div>

      {!isClassroomSelected && (
        <StateView
          type="empty"
          description={t("Pastdagi jadvalni ko'rish uchun sinfni tanlang. Yuqoridagi umumiy statistika ko'rinishda qoladi.")}
        />
      )}
      {isClassroomSelected && studentsState.loading && <StateView type="loading" />}
      {isClassroomSelected && studentsState.error && <StateView type="error" description={studentsState.error} />}
      {isClassroomSelected && !studentsState.loading && !studentsState.error && (
        <>
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
        </>
      )}

      {isClassroomSelected && (
        <div className="mt-3 flex justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onChangeQuery({ page: Math.max(1, query.page - 1) })}
            disabled={query.page <= 1}
          >
            {t('Oldingi')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onChangeQuery({ page: Math.min(studentsState.pages || 1, query.page + 1) })}
            disabled={query.page >= (studentsState.pages || 1)}
          >
            {t('Keyingi')}
          </Button>
        </div>
      )}
    </Card>
  );
}
