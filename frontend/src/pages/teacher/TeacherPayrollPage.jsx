import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  DataTable,
  Input,
  Select,
  StateView,
} from '../../components/ui';
import {
  useGetTeacherPayslipDetailQuery,
  useGetTeacherPayslipsQuery,
} from '../../services/api/payrollApi';

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('uz-UZ').format(Number.isFinite(n) ? n : 0);
}

function StatusPill({ value }) {
  const map = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    APPROVED: 'bg-amber-50 text-amber-700 border-amber-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REVERSED: 'bg-rose-50 text-rose-700 border-rose-200',
    LESSON: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    BONUS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENALTY: 'bg-rose-50 text-rose-700 border-rose-200',
    MANUAL: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${map[value] || map.DRAFT}`}>{value}</span>;
}

export default function TeacherPayrollPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState({
    page: 1,
    limit: 20,
    status: '',
    periodMonth: '',
  });
  const [selectedRunId, setSelectedRunId] = useState('');
  const [linePage, setLinePage] = useState(1);
  const [lineLimit, setLineLimit] = useState(100);

  const payslipsQuery = useGetTeacherPayslipsQuery({
    page: query.page,
    limit: query.limit,
    ...(query.status ? { status: query.status } : {}),
    ...(query.periodMonth ? { periodMonth: query.periodMonth } : {}),
  });
  const payslips = payslipsQuery.data?.payslips || [];
  const selectedRun = selectedRunId || payslips[0]?.payrollRunId || payslips[0]?.payrollRun?.id || '';
  const payslipDetailQuery = useGetTeacherPayslipDetailQuery(
    { runId: selectedRun, params: { page: linePage, limit: lineLimit } },
    { skip: !selectedRun },
  );

  const payslipColumns = useMemo(
    () => [
      { key: 'periodMonth', header: t('Oy'), render: (row) => row.payrollRun?.periodMonth || '-' },
      { key: 'status', header: t('Holat'), render: (row) => <StatusPill value={row.payrollRun?.status} /> },
      { key: 'totalHours', header: t('Soat'), render: (row) => row.totalHours || 0 },
      { key: 'grossAmount', header: t('Brutto'), render: (row) => formatMoney(row.grossAmount) },
      { key: 'adjustmentAmount', header: t('Adj'), render: (row) => formatMoney(row.adjustmentAmount) },
      { key: 'payableAmount', header: t("To'lanadi"), render: (row) => formatMoney(row.payableAmount) },
      { key: 'paidAt', header: t("To'langan"), render: (row) => formatDateTime(row.payrollRun?.paidAt) },
      {
        key: 'actions',
        header: t('Amallar'),
        render: (row) => (
          <Button
            size="sm"
            variant={(row.payrollRunId || row.payrollRun?.id) === selectedRun ? 'indigo' : 'secondary'}
            onClick={() => {
              setSelectedRunId(row.payrollRunId || row.payrollRun?.id || '');
              setLinePage(1);
            }}
          >
            {t("Ko'rish")}
          </Button>
        ),
      },
    ],
    [selectedRun, t],
  );

  const lineColumns = useMemo(
    () => [
      { key: 'type', header: t('Turi'), render: (row) => <StatusPill value={row.type} /> },
      { key: 'lessonStartAt', header: t('Dars vaqti'), render: (row) => formatDateTime(row.lessonStartAt || row.realLesson?.startAt) },
      {
        key: 'subject',
        header: t('Fan / Sinf'),
        render: (row) => (
          <div className="text-xs text-slate-700">
            <div>{row.subject?.name || '-'}</div>
            <div>{row.classroom ? `${row.classroom.name} (${row.classroom.academicYear})` : '-'}</div>
          </div>
        ),
      },
      { key: 'minutes', header: t('Daqiqa'), render: (row) => row.minutes ?? '-' },
      { key: 'ratePerHour', header: t('Rate'), render: (row) => (row.ratePerHour ? formatMoney(row.ratePerHour) : '-') },
      { key: 'amount', header: t('Summa'), render: (row) => formatMoney(row.amount) },
      { key: 'description', header: t('Izoh'), render: (row) => row.description || '-' },
    ],
    [t],
  );

  const payslipDetail = payslipDetailQuery.data?.payslip || null;
  const lines = payslipDetailQuery.data?.lines?.items || [];

  return (
    <div className="space-y-4">
      <Card
        title={t("Mening oyliklarim")}
        subtitle={t("Payroll runlar bo'yicha oylik va line tafsilotlarini ko'ring")}
        actions={(
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Input type="month" value={query.periodMonth} onChange={(e) => setQuery((prev) => ({ ...prev, periodMonth: e.target.value, page: 1 }))} />
            <Select value={query.status} onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value, page: 1 }))}>
              <option value="">{t('Barcha status')}</option>
              <option value="DRAFT">DRAFT</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PAID">PAID</option>
              <option value="REVERSED">REVERSED</option>
            </Select>
            <Select value={String(query.limit)} onChange={(e) => setQuery((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}>
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </Select>
            <Button variant="secondary" onClick={() => payslipsQuery.refetch()}>
              {t('Yangilash')}
            </Button>
          </div>
        )}
      >
        {payslipsQuery.isLoading || payslipsQuery.isFetching ? (
          <StateView type="skeleton" />
        ) : payslipsQuery.error ? (
          <StateView type="error" description={payslipsQuery.error?.message} />
        ) : (
          <>
            <DataTable columns={payslipColumns} rows={payslips} density="compact" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <div>{t('Jami')}: {payslipsQuery.data?.total || 0}</div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={(payslipsQuery.data?.page || 1) <= 1}
                  onClick={() => setQuery((prev) => ({ ...prev, page: Math.max(1, (payslipsQuery.data?.page || 1) - 1) }))}
                >
                  {t('Oldingi')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={(payslipsQuery.data?.page || 1) >= (payslipsQuery.data?.pages || 1)}
                  onClick={() => setQuery((prev) => ({ ...prev, page: Math.min((payslipsQuery.data?.pages || 1), (payslipsQuery.data?.page || 1) + 1) }))}
                >
                  {t('Keyingi')}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Card title={t('Payslip Tafsiloti')} subtitle={payslipDetail?.payrollRun?.periodMonth || t('Run tanlanmagan')}>
        {!selectedRun && <StateView type="empty" description={t('Payslip tanlang')} />}
        {selectedRun && (payslipDetailQuery.isLoading || payslipDetailQuery.isFetching) && <StateView type="skeleton" />}
        {selectedRun && payslipDetailQuery.error && <StateView type="error" description={payslipDetailQuery.error?.message} />}
        {payslipDetail && !payslipDetailQuery.isLoading && !payslipDetailQuery.error && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-xs text-slate-500">{t('Status')}</div><div className="mt-1"><StatusPill value={payslipDetail.payrollRun?.status} /></div></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-xs text-slate-500">{t('Daqiqa')}</div><div className="mt-1 font-semibold">{payslipDetail.totalMinutes || 0}</div></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-xs text-slate-500">{t('Soat')}</div><div className="mt-1 font-semibold">{payslipDetail.totalHours || 0}</div></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-xs text-slate-500">{t('Brutto')}</div><div className="mt-1 font-semibold">{formatMoney(payslipDetail.grossAmount)}</div></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-xs text-slate-500">{t('Adjustment')}</div><div className="mt-1 font-semibold">{formatMoney(payslipDetail.adjustmentAmount)}</div></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-xs text-slate-500">{t("To'lanadi")}</div><div className="mt-1 font-semibold">{formatMoney(payslipDetail.payableAmount)}</div></div>
            </div>
            <DataTable columns={lineColumns} rows={lines} density="compact" maxHeightClassName="max-h-[480px]" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <div>{t('Jami line')}: {payslipDetailQuery.data?.lines?.total || 0}</div>
              <div className="flex items-center gap-2">
                <Select value={String(lineLimit)} onChange={(e) => { setLineLimit(Number(e.target.value)); setLinePage(1); }} className="w-24">
                  {[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                </Select>
                <Button size="sm" variant="secondary" disabled={(payslipDetailQuery.data?.lines?.page || 1) <= 1} onClick={() => setLinePage((p) => Math.max(1, p - 1))}>
                  {t('Oldingi')}
                </Button>
                <Button size="sm" variant="secondary" disabled={(payslipDetailQuery.data?.lines?.page || 1) >= (payslipDetailQuery.data?.lines?.pages || 1)} onClick={() => setLinePage((p) => p + 1)}>
                  {t('Keyingi')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
