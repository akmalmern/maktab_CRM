import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AutoTranslate from '../../../../components/AutoTranslate';
import {
  Button,
  Card,
  Input,
  Select,
  StateView,
} from '../../../../components/ui';
import { DashboardStats } from '../../../../components/admin';
import { useGetAdminAttendanceReportQuery } from '../../../../services/api/attendanceApi';
import { useGetClassroomsQuery } from '../../../../services/api/classroomsApi';
import { useGetFinanceStudentsQuery } from '../../../../services/api/financeApi';
import { useGetTeachersQuery, useGetStudentsQuery } from '../../../../services/api/peopleApi';
import { useGetPayrollMonthlyReportQuery } from '../../../../services/api/payrollApi';
import { useGetAdminDarsJadvaliQuery } from '../../../../services/api/scheduleApi';
import { toFinanceClassroomParam } from '../financeQueryParams';

const DAY_BY_JS = {
  1: 'DUSHANBA',
  2: 'SESHANBA',
  3: 'CHORSHANBA',
  4: 'PAYSHANBA',
  5: 'JUMA',
  6: 'SHANBA',
};

function pct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatMoney(value, locale) {
  const n = Number(value || 0);
  return `${new Intl.NumberFormat(locale).format(Number.isFinite(n) ? n : 0)} so'm`;
}

function formatNumber(value, locale) {
  const n = Number(value || 0);
  return new Intl.NumberFormat(locale).format(Number.isFinite(n) ? n : 0);
}

function resolveLocale(language) {
  if (language === 'ru') return 'ru-RU';
  if (language === 'en') return 'en-US';
  return 'uz-UZ';
}

const DASHBOARD_LIST_QUERY = {
  search: '',
  page: 1,
  limit: 1,
  filter: 'all',
  sort: 'name:asc',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function KpiCard({ label, value, subValue, tone = 'slate' }) {
  const toneClasses = {
    slate: 'border-slate-200 bg-slate-50',
    indigo: 'border-indigo-200 bg-indigo-50/60',
    emerald: 'border-emerald-200 bg-emerald-50/60',
    amber: 'border-amber-200 bg-amber-50/60',
    rose: 'border-rose-200 bg-rose-50/60',
  };

  return (
    <div className={`rounded-xl border p-3 ${toneClasses[tone] || toneClasses.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {subValue ? <p className="mt-1 text-xs text-slate-500">{subValue}</p> : null}
    </div>
  );
}

function AlertRow({ tone = 'info', title, message }) {
  const toneClasses = {
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    critical: 'border-rose-200 bg-rose-50 text-rose-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };

  return (
    <div className={`rounded-lg border p-3 ${toneClasses[tone] || toneClasses.info}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs opacity-90">{message}</p>
    </div>
  );
}

function buildFinanceLink(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `/admin/moliya?${query}` : '/admin/moliya';
}

export default function DashboardSection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = resolveLocale(i18n.language);
  const [periodMonth, setPeriodMonth] = useState(currentMonthKey());
  const [classroomId, setClassroomId] = useState('all');
  const [search, setSearch] = useState('');

  const jsDay = new Date().getDay();
  const haftaKuni = DAY_BY_JS[jsDay];
  const scopedClassroomId = toFinanceClassroomParam(classroomId);

  const teachersQuery = useGetTeachersQuery(DASHBOARD_LIST_QUERY);
  const studentsQuery = useGetStudentsQuery(DASHBOARD_LIST_QUERY);
  const classroomsQuery = useGetClassroomsQuery();
  const financeStudentsQuery = useGetFinanceStudentsQuery({
    page: 1,
    limit: 20,
    status: 'ALL',
    debtMonth: 'ALL',
    debtTargetMonth: undefined,
    cashflowMonth: periodMonth || undefined,
    search: search || '',
    classroomId: scopedClassroomId,
  });
  const payrollMonthlyReportQuery = useGetPayrollMonthlyReportQuery({
    periodMonth,
    includeDetails: false,
  });
  const attendanceQuery = useGetAdminAttendanceReportQuery({
    sana: todayIso(),
    ...(scopedClassroomId ? { classroomId: scopedClassroomId } : {}),
  });
  const darslarQuery = useGetAdminDarsJadvaliQuery({
    ...(scopedClassroomId ? { sinfId: scopedClassroomId } : {}),
  });

  const attendanceReport = attendanceQuery.data || null;
  const financeSummary = financeStudentsQuery.data?.summary || null;
  const payrollSummary = payrollMonthlyReportQuery.data?.summary || null;
  const payrollRun = payrollMonthlyReportQuery.data?.run || null;

  const headerStats = [
    { label: "O'qituvchilar", value: formatNumber(teachersQuery.data?.total || 0, locale) },
    { label: "O'quvchilar", value: formatNumber(studentsQuery.data?.total || 0, locale) },
    { label: 'Sinflar', value: formatNumber((classroomsQuery.data?.classrooms || []).length || 0, locale) },
  ];

  const todayLessons = useMemo(() => {
    if (!haftaKuni) return 0;
    const darslar = darslarQuery.data?.darslar || [];
    return darslar.filter((d) => d.haftaKuni === haftaKuni).length;
  }, [darslarQuery.data, haftaKuni]);

  const foizlar = attendanceReport?.foizlar || {};
  const cashflow = financeSummary?.cashflow || {};
  const monthlyPlanAmount = Number(cashflow.planAmount || financeSummary?.monthlyPlanAmount || 0);
  const collectedAmount = Number(cashflow.collectedAmount || 0);
  const thisMonthDebtAmount = Number(financeSummary?.thisMonthDebtAmount || 0);
  const totalDebtAmount = Number(financeSummary?.totalDebtAmount || 0);
  const debtorsCount = Number(financeSummary?.totalDebtors || 0);
  const payrollPayoutAmount = Number(cashflow.payrollPayoutAmount || 0);
  const payrollReversalAmount = Number(cashflow.payrollReversalAmount || 0);
  const netCashflowAmount = Number(cashflow.netAmount || (collectedAmount - payrollPayoutAmount + payrollReversalAmount));
  const collectionRate = monthlyPlanAmount > 0 ? (collectedAmount / monthlyPlanAmount) * 100 : 0;
  const payrollPayableAmount = Number(payrollSummary?.payableAmount || 0);
  const payrollPaidAmount = Number(payrollSummary?.paidAmount || 0);
  const payrollRemainingAmount = Number(payrollSummary?.remainingAmount || 0);
  const payrollCompletionRate = payrollPayableAmount > 0 ? (payrollPaidAmount / payrollPayableAmount) * 100 : 0;
  const classroomCount = Number((classroomsQuery.data?.classrooms || []).length || 0);
  const topDebtors = (financeSummary?.topDebtors || []).slice(0, 5);
  const topDebtorClassrooms = (financeSummary?.topDebtorClassrooms || []).slice(0, 5);
  const selectedClassroomLabel = useMemo(() => {
    if (!scopedClassroomId) return t('Barcha sinflar');
    const row = (classroomsQuery.data?.classrooms || []).find((item) => item.id === scopedClassroomId);
    if (!row) return t('Tanlangan sinf');
    return `${row.name} (${row.academicYear})`;
  }, [classroomsQuery.data?.classrooms, scopedClassroomId, t]);
  const isDashboardLoading =
    financeStudentsQuery.isLoading ||
    financeStudentsQuery.isFetching ||
    payrollMonthlyReportQuery.isLoading ||
    payrollMonthlyReportQuery.isFetching ||
    attendanceQuery.isLoading ||
    attendanceQuery.isFetching ||
    darslarQuery.isLoading ||
    darslarQuery.isFetching;

  const summaryError =
    financeStudentsQuery.error?.message ||
    payrollMonthlyReportQuery.error?.message ||
    attendanceQuery.error?.message ||
    darslarQuery.error?.message ||
    null;

  const snapshotStats = [
    { label: 'Bugungi darslar (reja)', value: formatNumber(todayLessons, locale) },
    { label: "Bugungi davomat", value: pct(foizlar.kunlik) },
    { label: 'Haftalik davomat', value: pct(foizlar.haftalik) },
    {
      label: "Bugun o'tilgan sessiyalar",
      value: formatNumber(attendanceReport?.jami?.tanlanganPeriodDarsSessiyalari || 0, locale),
    },
  ];
  const alertItems = [];
  if (thisMonthDebtAmount > 0) {
    alertItems.push({
      tone: 'critical',
      title: t("Shu oy qarz mavjud"),
      message: `${formatMoney(thisMonthDebtAmount, locale)} | ${t("Qarzdorlar")}: ${formatNumber(debtorsCount, locale)}`,
    });
  }
  if (monthlyPlanAmount > 0 && collectionRate < 70) {
    alertItems.push({
      tone: 'critical',
      title: t("Undirish past"),
      message: `${t('Collection rate')}: ${pct(collectionRate)}`,
    });
  } else if (monthlyPlanAmount > 0 && collectionRate < 90) {
    alertItems.push({
      tone: 'warning',
      title: t("Undirish o'rtacha"),
      message: `${t('Collection rate')}: ${pct(collectionRate)}`,
    });
  }
  if (payrollRemainingAmount > 0) {
    alertItems.push({
      tone: 'warning',
      title: t("Oylik to'liq yopilmagan"),
      message: `${t('Qoldiq')}: ${formatMoney(payrollRemainingAmount, locale)}`,
    });
  }
  const dailyAttendance = Number(foizlar.kunlik || 0);
  if (dailyAttendance > 0 && dailyAttendance < 80) {
    alertItems.push({
      tone: dailyAttendance < 70 ? 'critical' : 'warning',
      title: t("Bugungi davomat past"),
      message: `${pct(dailyAttendance)} | ${t("Sinf filtri")}: ${selectedClassroomLabel}`,
    });
  }
  if (alertItems.length === 0) {
    alertItems.push({
      tone: 'success',
      title: t('Kritik ogohlantirish yo\'q'),
      message: t("Asosiy moliya va oylik ko'rsatkichlari barqaror."),
    });
  }
  function openDebtorRisk(row) {
    const searchValue = row?.username || row?.fullName || '';
    navigate(buildFinanceLink({
      status: 'QARZDOR',
      classroomId: row?.classroomId || undefined,
      search: searchValue,
      page: 1,
    }));
  }

  function openClassroomRisk(row) {
    navigate(buildFinanceLink({
      status: 'QARZDOR',
      classroomId: row?.classroomId || undefined,
      page: 1,
    }));
  }

  return (
    <AutoTranslate>
      <div className="space-y-6">
        <DashboardStats stats={headerStats} />

        <Card
          title={t('Boshqaruv Dashboard')}
          subtitle={`${selectedClassroomLabel} | ${periodMonth}`}
          actions={(
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <Input
                type="month"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value || currentMonthKey())}
              />
              <Select value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
                <option value="all">{t('Barcha sinflar')}</option>
                {(classroomsQuery.data?.classrooms || []).map((row) => (
                  <option key={row.id} value={row.id}>{row.name} ({row.academicYear})</option>
                ))}
              </Select>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Ism yoki username...")}
              />
              <div className="flex gap-2">
                <Button variant="secondary" className="w-full" onClick={() => navigate('/admin/moliya')}>
                  {t('Moliya')}
                </Button>
                <Button variant="indigo" className="w-full" onClick={() => navigate('/admin/oylik')}>
                  {t('Oylik')}
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => navigate('/admin/sozlamalar')}>
                  {t('Sozlamalar')}
                </Button>
              </div>
            </div>
          )}
        >
          {isDashboardLoading ? <StateView type="skeleton" /> : null}
          {summaryError ? <StateView type="error" description={summaryError} /> : null}

          <div className="mb-3 text-xs text-slate-500">
            {t("Oxirgi yangilanish")}: {new Date().toLocaleString(locale)}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              label={t("Oylik reja")}
              value={formatMoney(monthlyPlanAmount, locale)}
              tone="indigo"
            />
            <KpiCard
              label={t("Amalda tushgan pul")}
              value={formatMoney(collectedAmount, locale)}
              subValue={`${t('Collection rate')}: ${pct(collectionRate)}`}
              tone="emerald"
            />
            <KpiCard
              label={t("Shu oy qarz summasi")}
              value={formatMoney(thisMonthDebtAmount, locale)}
              tone={thisMonthDebtAmount > 0 ? 'rose' : 'slate'}
            />
            <KpiCard
              label={t("Qarzdor o'quvchilar soni")}
              value={formatNumber(debtorsCount, locale)}
              subValue={`${t("Umumiy qarzdorlik summasi")}: ${formatMoney(totalDebtAmount, locale)}`}
              tone={debtorsCount > 0 ? 'amber' : 'slate'}
            />
            <KpiCard
              label={t("Oylik chiqimi (payroll)")}
              value={formatMoney(payrollPayoutAmount, locale)}
              subValue={`${t("Oylik qaytarma (reversal)")}: ${formatMoney(payrollReversalAmount, locale)}`}
              tone="rose"
            />
            <KpiCard
              label={t("Sof pul oqimi (tushum - oylik)")}
              value={formatMoney(netCashflowAmount, locale)}
              tone="emerald"
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card
            title={t("Oylik holati")}
            subtitle={`${t("Hisob-kitob holati")}: ${payrollRun?.status || '-'}`}
            actions={(
              <Button variant="secondary" onClick={() => navigate('/admin/oylik')}>
                {t("Oylik bo'limiga o'tish")}
              </Button>
            )}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <KpiCard label={t("To'lanadi")} value={formatMoney(payrollPayableAmount, locale)} tone="indigo" />
              <KpiCard label={t("To'langan")} value={formatMoney(payrollPaidAmount, locale)} tone="emerald" />
              <KpiCard label={t('Qoldiq')} value={formatMoney(payrollRemainingAmount, locale)} tone={payrollRemainingAmount > 0 ? 'amber' : 'slate'} />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {t("O'qituvchilar")}: {formatNumber(payrollRun?.teacherCount || 0, locale)} | {t('Completion rate')}: {pct(payrollCompletionRate)}
            </p>
          </Card>

          <Card
            title={t('Akademik snapshot')}
            subtitle={`${t('Bugungi darslar')}: ${formatNumber(todayLessons, locale)} | ${t('Sinflar')}: ${formatNumber(classroomCount, locale)}`}
            actions={(
              <Button variant="secondary" onClick={() => navigate('/admin/davomat')}>
                {t("Davomat bo'limi")}
              </Button>
            )}
          >
            <div className="grid grid-cols-2 gap-3">
              {snapshotStats.map((item) => (
                <KpiCard key={item.label} label={item.label} value={item.value} tone="slate" />
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card
            title={t('Alert Center')}
            subtitle={t("Real vaqt ogohlantirishlari")}
            actions={(
              <Button variant="secondary" onClick={() => navigate('/admin/moliya')}>
                {t('Moliya bo\'limiga o\'tish')}
              </Button>
            )}
          >
            <div className="space-y-2">
              {alertItems.map((item, idx) => (
                <AlertRow
                  key={`${item.title}-${idx}`}
                  tone={item.tone}
                  title={item.title}
                  message={item.message}
                />
              ))}
            </div>
          </Card>

          <Card
            title={t('Top Risk')}
            subtitle={t("Eng katta qarzdor nuqtalar")}
            actions={(
              <Button variant="secondary" onClick={() => navigate('/admin/moliya')}>
                {t("Qarzdorlar ro'yxati")}
              </Button>
            )}
          >
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t("Top qarzdor o'quvchilar")}
                </p>
                <div className="mt-2 space-y-2">
                  {topDebtors.length ? topDebtors.map((row) => (
                    <button
                      key={row.studentId}
                      type="button"
                      onClick={() => openDebtorRisk(row)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {row.fullName} ({row.username})
                        </p>
                        <p className="truncate text-xs text-slate-500">{row.classroom || '-'}</p>
                      </div>
                      <p className="text-sm font-semibold text-rose-700">
                        {formatMoney(row.totalDebtAmount, locale)}
                      </p>
                    </button>
                  )) : (
                    <p className="text-sm text-slate-500">{t('Qarzdor topilmadi')}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t('Top qarzdor sinflar')}
                </p>
                <div className="mt-2 space-y-2">
                  {topDebtorClassrooms.length ? topDebtorClassrooms.map((row) => (
                    <button
                      key={row.classroomId || row.classroom}
                      type="button"
                      onClick={() => openClassroomRisk(row)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{row.classroom || '-'}</p>
                        <p className="text-xs text-slate-500">
                          {t("Qarzdorlar soni")}: {formatNumber(row.debtorCount, locale)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-rose-700">
                        {formatMoney(row.totalDebtAmount, locale)}
                      </p>
                    </button>
                  )) : (
                    <p className="text-sm text-slate-500">{t('Qarzdor sinf topilmadi')}</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </AutoTranslate>
  );
}
