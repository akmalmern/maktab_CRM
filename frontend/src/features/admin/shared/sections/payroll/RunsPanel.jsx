import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  DataTable,
  Input,
  Select,
  StateView,
  Textarea,
} from '../../../../../components/ui';

function getRunStatusLabel(value, t) {
  const labels = {
    DRAFT: t('Loyiha'),
    APPROVED: t('Tasdiqlangan'),
    PAID: t("To'langan"),
    REVERSED: t('Bekor qilingan'),
  };
  return labels[value] || value || '-';
}

function getPaymentMethodLabel(value, t) {
  const labels = {
    BANK: t("Bank o'tkazmasi"),
    CASH: t('Naqd pul'),
    CLICK: 'Click',
    PAYME: 'Payme',
  };
  return labels[value] || value || '-';
}

function Field({ label, children }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ value }) {
  const { t } = useTranslation();
  const colorMap = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    APPROVED: 'bg-amber-50 text-amber-700 border-amber-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REVERSED: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${colorMap[value] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      {getRunStatusLabel(value, t)}
    </span>
  );
}

function StatWidget({ label, value, tone = 'slate', subtitle }) {
  const toneClasses = {
    slate: 'border-slate-200 bg-slate-50',
    indigo: 'border-indigo-200 bg-indigo-50/60',
    emerald: 'border-emerald-200 bg-emerald-50/60',
    amber: 'border-amber-200 bg-amber-50/60',
    rose: 'border-rose-200 bg-rose-50/60',
  };

  return (
    <div className={`rounded-xl border p-3 ${toneClasses[tone] || toneClasses.slate}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
    </div>
  );
}

export function PayrollRunsPanel({
  tab,
  periodMonth,
  setPeriodMonth,
  setRunFilters,
  runs,
  activeRunId,
  setSelectedRunId,
  selectedRun,
  runsState,
  runDetailLoading,
  runDetailError,
  isAdminView,
  isManagerView,
  busy,
  handleRefreshRunsDashboard,
  handleGenerateRun,
  formatMoney,
  selectedRunPayableAmount,
  selectedRunPaidAmount,
  selectedRunRemainingAmount,
  runItemsColumns,
  runItemsRows,
  selectedRunTeacherCount,
  payForm,
  setPayForm,
  canPaySelectedRun,
  runPrimaryAction,
  canReverseSelectedRun,
  reverseReason,
  setReverseReason,
  handleReverseRun,
}) {
  const { t } = useTranslation();

  if (tab !== 'runs') return null;

  return (
    <>
      <Card
        title={t('Joriy Oylik')}
        subtitle={t("Faqat asosiy oqim: yaratish, ko'rish, tasdiqlash va to'lash")}
        actions={(
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Input
              type="month"
              value={periodMonth}
              onChange={(e) => {
                const nextMonth = e.target.value;
                setPeriodMonth(nextMonth);
                setRunFilters((prev) => ({ ...prev, periodMonth: nextMonth, page: 1 }));
              }}
            />
            {runs.length > 1 ? (
              <Select value={activeRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.periodMonth} | {getRunStatusLabel(run.status, t)}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex items-center rounded-xl border border-slate-200 px-3 text-sm text-slate-600">
                {selectedRun ? getRunStatusLabel(selectedRun.status, t) : t("Hisob-kitob yo'q")}
              </div>
            )}
            <Button variant="secondary" onClick={handleRefreshRunsDashboard} disabled={runsState.loading || busy}>
              {t('Yangilash')}
            </Button>
            {isAdminView && (
              <Button variant="indigo" onClick={handleGenerateRun} disabled={busy || !periodMonth}>
                {selectedRun ? t('Qayta yaratish') : t('Yaratish')}
              </Button>
            )}
          </div>
        )}
      >
        {runsState.loading || runDetailLoading ? <StateView type="skeleton" /> : null}
        {runsState.error ? <StateView type="error" description={runsState.error} /> : null}
        {runDetailError ? <StateView type="error" description={runDetailError} /> : null}

        {!runsState.loading && !runsState.error && !selectedRun && (
          <StateView
            type="empty"
            description={t("Tanlangan oy uchun hisob-kitob topilmadi. Avval Yaratish tugmasini bosing.")}
          />
        )}

        {selectedRun && !runDetailLoading && !runDetailError && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <StatWidget
                label={t("To'lanadi")}
                value={formatMoney(selectedRunPayableAmount)}
                tone="indigo"
                subtitle={`${selectedRun.periodMonth} | ${getRunStatusLabel(selectedRun.status, t)}`}
              />
              <StatWidget
                label={t("To'langan")}
                value={formatMoney(selectedRunPaidAmount)}
                tone="emerald"
                subtitle={t("Xodimlar bo'yicha to'lov yig'indisi")}
              />
              <StatWidget
                label={t('Qoldiq')}
                value={formatMoney(selectedRunRemainingAmount)}
                tone={selectedRunRemainingAmount > 0 ? 'amber' : 'slate'}
                subtitle={t("To'lanishi kerak qolgan summa")}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Card title={t("O'qituvchilar ro'yxati")} className="xl:col-span-2">
                <div className="mb-2 text-xs text-slate-500">
                  {t("Barcha faol o'qituvchilar ko'rsatiladi. Hisoblanmaganlar alohida holatda turadi.")}
                </div>
                <DataTable
                  columns={runItemsColumns}
                  rows={runItemsRows || []}
                  density="compact"
                  maxHeightClassName="max-h-[360px]"
                />
              </Card>

              <Card title={t('Asosiy amal')} className="xl:col-span-1">
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>{t("Hisob-kitob holati")}</span>
                      <StatusPill value={selectedRun.status} />
                    </div>
                    <div className="mt-2">{t("O'qituvchilar")}: {selectedRunTeacherCount || 0}</div>
                  </div>

                  {isAdminView && selectedRun.status === 'APPROVED' && (
                    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                      <Field label={t("To'lov usuli")}>
                        <Select
                          value={payForm.paymentMethod}
                          onChange={(e) => setPayForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                          disabled={!canPaySelectedRun || busy}
                        >
                          <option value="BANK">{getPaymentMethodLabel('BANK', t)}</option>
                          <option value="CASH">{getPaymentMethodLabel('CASH', t)}</option>
                          <option value="CLICK">{getPaymentMethodLabel('CLICK', t)}</option>
                          <option value="PAYME">{getPaymentMethodLabel('PAYME', t)}</option>
                        </Select>
                      </Field>
                    </div>
                  )}

                  {runPrimaryAction ? (
                    <Button
                      className="w-full"
                      variant={runPrimaryAction.variant}
                      onClick={runPrimaryAction.onClick}
                      disabled={runPrimaryAction.disabled}
                    >
                      {runPrimaryAction.label}
                    </Button>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {t("Bu holatda asosiy amal mavjud emas")}
                    </div>
                  )}

                  {!isManagerView && canReverseSelectedRun && (
                    <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/40 p-3">
                      <Field label={t('Bekor qilish sababi')}>
                        <Textarea
                          rows={2}
                          value={reverseReason}
                          onChange={(e) => setReverseReason(e.target.value)}
                          disabled={!canReverseSelectedRun || busy}
                        />
                      </Field>
                      <Button
                        className="w-full"
                        variant="danger"
                        disabled={!canReverseSelectedRun || !reverseReason.trim() || busy}
                        onClick={handleReverseRun}
                      >
                        {t('Bekor qilish')}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
