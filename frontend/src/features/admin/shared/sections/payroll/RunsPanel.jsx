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

function Field({ label, children }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ value }) {
  const colorMap = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    APPROVED: 'bg-amber-50 text-amber-700 border-amber-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REVERSED: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${colorMap[value] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      {value || '-'}
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
  automationHealth,
  monthlyReportSummary,
  monthlyReport,
  automationHealthState,
  monthlyReportState,
  formatMoney,
  automationForm,
  setAutomationForm,
  handleRunAutomation,
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
        subtitle={t("Faqat asosiy oqim: generate, ko'rish, approve va to'lash")}
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
                    {run.periodMonth} | {run.status}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex items-center rounded-xl border border-slate-200 px-3 text-sm text-slate-600">
                {selectedRun ? selectedRun.status : t("Run yo'q")}
              </div>
            )}
            <Button variant="secondary" onClick={handleRefreshRunsDashboard} disabled={runsState.loading || busy}>
              {t('Yangilash')}
            </Button>
            {isAdminView && (
              <Button variant="indigo" onClick={handleGenerateRun} disabled={busy || !periodMonth}>
                {selectedRun ? t('Regenerate') : t('Generate')}
              </Button>
            )}
          </div>
        )}
      >
        {runsState.loading || runDetailLoading ? <StateView type="skeleton" /> : null}
        {runsState.error ? <StateView type="error" description={runsState.error} /> : null}
        {runDetailError ? <StateView type="error" description={runDetailError} /> : null}
        {!runsState.error && !runDetailError && (
          <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <StatWidget
                label={t('Automation holati')}
                value={automationHealth?.summary?.readyForGenerate ? t('Tayyor') : t('Tekshirish kerak')}
                tone={automationHealth?.summary?.readyForGenerate ? 'emerald' : 'amber'}
                subtitle={t('Blocker: {{blockers}} | Warning: {{warnings}}', {
                  blockers: automationHealth?.summary?.blockerCount || 0,
                  warnings: automationHealth?.summary?.warningCount || 0,
                })}
              />
              <StatWidget
                label={t("Report: To'lanadi")}
                value={formatMoney(monthlyReportSummary?.payableAmount || 0)}
                tone="indigo"
                subtitle={t('Oy: {{month}}', { month: periodMonth })}
              />
              <StatWidget
                label={t("Report: Qoldiq")}
                value={formatMoney(monthlyReportSummary?.remainingAmount || 0)}
                tone={Number(monthlyReportSummary?.remainingAmount || 0) > 0 ? 'amber' : 'slate'}
                subtitle={t("To'lovlar soni: {{count}}", { count: monthlyReportSummary?.paymentCount || 0 })}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 xl:col-span-2">
                {(automationHealthState.loading || monthlyReportState.loading) ? (
                  <StateView type="skeleton" />
                ) : null}
                {automationHealthState.error ? <StateView type="error" description={automationHealthState.error} /> : null}
                {monthlyReportState.error ? <StateView type="error" description={monthlyReportState.error} /> : null}
                {!automationHealthState.loading && !monthlyReportState.loading && !automationHealthState.error && !monthlyReportState.error && (
                  <>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t('Line Type kesimi')}
                      </div>
                      {(monthlyReport?.lineTypeBreakdown || []).length ? (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {(monthlyReport?.lineTypeBreakdown || []).slice(0, 6).map((row) => (
                            <div key={`line-${row.type}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                              <span className="text-slate-600">{row.type}</span>
                              <span className="font-semibold text-slate-900">{formatMoney(row.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          {t("Line type bo'yicha ma'lumot yo'q")}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Automation')}</div>
                {isAdminView ? (
                  <>
                    <Field label={t('Rejim')}>
                      <Select
                        value={automationForm.mode}
                        onChange={(e) => setAutomationForm((prev) => ({ ...prev, mode: e.target.value }))}
                        disabled={busy}
                      >
                        <option value="GENERATE_ONLY">{t('Generate only')}</option>
                        <option value="GENERATE_APPROVE">{t('Generate + Approve')}</option>
                        <option value="FULL_PAY">{t('Generate + Approve + Pay')}</option>
                      </Select>
                    </Field>
                    {automationForm.mode === 'FULL_PAY' && (
                      <Field label={t("To'lov usuli")}>
                        <Select
                          value={automationForm.paymentMethod}
                          onChange={(e) => setAutomationForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                          disabled={busy}
                        >
                          <option value="BANK">BANK</option>
                          <option value="CASH">CASH</option>
                          <option value="CLICK">CLICK</option>
                          <option value="PAYME">PAYME</option>
                        </Select>
                      </Field>
                    )}
                    <Field label={t('Force')}>
                      <Select
                        value={automationForm.force ? 'true' : 'false'}
                        onChange={(e) => setAutomationForm((prev) => ({ ...prev, force: e.target.value === 'true' }))}
                        disabled={busy}
                      >
                        <option value="false">{t("Yo'q")}</option>
                        <option value="true">{t('Ha')}</option>
                      </Select>
                    </Field>
                    <div className="grid grid-cols-1 gap-2">
                      <Button variant="secondary" onClick={() => handleRunAutomation({ dryRun: true })} disabled={busy}>
                        {t('Dry Run')}
                      </Button>
                      <Button variant="indigo" onClick={() => handleRunAutomation({ dryRun: false })} disabled={busy}>
                        {t('Auto Process')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {t("Menejer bu blokda faqat holatni kuzatadi")}
                  </div>
                )}
                <Button variant="secondary" onClick={handleRefreshRunsDashboard} disabled={busy}>
                  {t('Health/Report yangilash')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {!runsState.loading && !runsState.error && !selectedRun && (
          <StateView
            type="empty"
            description={t("Tanlangan oy uchun run topilmadi. Avval Generate bosing.")}
          />
        )}

        {selectedRun && !runDetailLoading && !runDetailError && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <StatWidget
                label={t("To'lanadi")}
                value={formatMoney(selectedRunPayableAmount)}
                tone="indigo"
                subtitle={`${selectedRun.periodMonth} | ${selectedRun.status}`}
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
                      <span>{t('Run holati')}</span>
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
                          <option value="BANK">BANK</option>
                          <option value="CASH">CASH</option>
                          <option value="CLICK">CLICK</option>
                          <option value="PAYME">PAYME</option>
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
                      <Field label={t('Reverse sababi')}>
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
                        {t('Reverse')}
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
