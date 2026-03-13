import { useTranslation } from 'react-i18next';
import { Button, Card, DataTable, Select } from '../../../../../components/ui';

export default function PayrollRunItemsTableCard({
  runItemsColumns,
  runItemsRows,
  runItemsState,
  lineFilters,
  setLineFilters,
}) {
  const { t } = useTranslation();

  return (
    <Card title={t("O'qituvchilar ro'yxati")} className="xl:col-span-2">
      <div className="mb-2 text-xs text-slate-500">
        {t("Barcha faol o'qituvchilar ko'rsatiladi. Hisoblanmaganlar alohida holatda turadi.")}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-1.5 text-[11px] font-semibold text-indigo-700">
          1
        </span>
        <span>{t("O'qituvchi stavkasi")}</span>
        <span className="text-slate-400">{'>'}</span>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-1.5 text-[11px] font-semibold text-slate-700">
          2
        </span>
        <span>{t('Fan stavkasi')}</span>
        <span className="text-slate-400">|</span>
        <span>{t('Stavka manbasi')}</span>
      </div>
      <DataTable
        columns={runItemsColumns}
        rows={runItemsRows || []}
        density="compact"
        maxHeightClassName="max-h-[360px]"
      />
      {runItemsState?.total > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            {t("Ko'rsatilmoqda")}: {runItemsRows?.length || 0} / {runItemsState.total}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(lineFilters?.limit || 20)}
              onChange={(e) =>
                setLineFilters?.((prev) => ({
                  ...prev,
                  limit: Number(e.target.value),
                  page: 1,
                }))
              }
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="secondary"
              disabled={(runItemsState.page || 1) <= 1}
              onClick={() =>
                setLineFilters?.((prev) => ({
                  ...prev,
                  page: Math.max(1, Number(prev.page || 1) - 1),
                }))
              }
            >
              {t('Oldingi')}
            </Button>
            <span>
              {runItemsState.page}/{runItemsState.pages}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={(runItemsState.page || 1) >= (runItemsState.pages || 1)}
              onClick={() =>
                setLineFilters?.((prev) => ({
                  ...prev,
                  page: Math.min(Number(runItemsState.pages || 1), Number(prev.page || 1) + 1),
                }))
              }
            >
              {t('Keyingi')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
