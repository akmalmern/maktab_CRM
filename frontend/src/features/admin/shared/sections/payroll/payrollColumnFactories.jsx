import { Button } from '../../../../../components/ui';
import {
  formatEmployeeConfigName,
  formatOwnerName,
  getPayrollStatusLabel,
  getRateSourceLabel,
} from './payrollSectionModel';

function renderStatusPill(value, t) {
  const colorMap = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    APPROVED: 'bg-amber-50 text-amber-700 border-amber-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REVERSED: 'bg-rose-50 text-rose-700 border-rose-200',
    DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELED: 'bg-slate-100 text-slate-700 border-slate-200',
    REPLACED: 'bg-violet-50 text-violet-700 border-violet-200',
    LESSON: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    FIXED_SALARY: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    ADVANCE_DEDUCTION: 'bg-amber-50 text-amber-700 border-amber-200',
    BONUS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENALTY: 'bg-rose-50 text-rose-700 border-rose-200',
    MANUAL: 'bg-slate-100 text-slate-700 border-slate-200',
    LESSON_BASED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    FIXED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    MIXED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MANUAL_ONLY: 'bg-slate-100 text-slate-700 border-slate-200',
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INACTIVE: 'bg-amber-50 text-amber-700 border-amber-200',
    ARCHIVED: 'bg-rose-50 text-rose-700 border-rose-200',
    UNPAID: 'bg-slate-100 text-slate-700 border-slate-200',
    PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
    NOT_GENERATED: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${colorMap[value] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      {getPayrollStatusLabel(value, t)}
    </span>
  );
}

export function createRunItemsColumns({
  t,
  formatMoney,
  isAdminView,
  selectedRunStatus,
  busy,
  openPayItemModal,
}) {
  return [
    {
      key: 'owner',
      header: t("O'qituvchi"),
      render: (row) => {
        const snapshotName = `${row.teacherFirstNameSnapshot || ''} ${row.teacherLastNameSnapshot || ''}`.trim();
        return formatOwnerName({
          teacher: row.teacher,
          employee: row.employee,
          fallbackName: snapshotName,
          fallbackId: row.teacherId || row.employeeId || '',
        });
      },
    },
    {
      key: 'subjects',
      header: t('Fan'),
      render: (row) => {
        const breakdown = row.subjectBreakdown || [];
        if (!breakdown.length) return '-';
        const names = breakdown.map((entry) => entry.subjectName).filter(Boolean);
        if (names.length <= 2) return names.join(', ');
        return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
      },
    },
    {
      key: 'ratePerHour',
      header: t('Soat narxi'),
      render: (row) => {
        const breakdown = row.subjectBreakdown || [];
        if (!breakdown.length) {
          return row.primaryRatePerHour ? formatMoney(row.primaryRatePerHour) : '-';
        }
        const rates = [...new Set(
          breakdown
            .map((entry) => Number(entry.ratePerHour || 0))
            .filter((entry) => Number.isFinite(entry) && entry > 0),
        )].sort((a, b) => a - b);
        if (!rates.length) return '-';
        if (rates.length === 1) return formatMoney(rates[0]);
        return `${formatMoney(rates[0])} - ${formatMoney(rates[rates.length - 1])}`;
      },
    },
    {
      key: 'rateSource',
      header: t('Stavka manbasi'),
      render: (row) => {
        const breakdown = row.subjectBreakdown || [];
        const sources = [...new Set(breakdown.map((entry) => entry.rateSource).filter(Boolean))];
        if (!sources.length) return '-';
        const labels = sources.map((source) => getRateSourceLabel(source, t));
        if (labels.length <= 2) return labels.join(', ');
        return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
      },
    },
    { key: 'payableAmount', header: t('Oylik summasi'), render: (row) => formatMoney(Math.max(0, Number(row.payableAmount || 0))) },
    { key: 'paymentStatus', header: t("To'lov holati"), render: (row) => renderStatusPill(row.paymentStatus || 'UNPAID', t) },
    {
      key: 'remainingAmount',
      header: t('Qoldiq'),
      render: (row) => formatMoney(Math.max(0, Number(row.payableAmount || 0) - Number(row.paidAmount || 0))),
    },
    {
      key: 'actions',
      header: t('Amallar'),
      render: (row) => {
        const remainingAmount = Math.max(0, Number(row.payableAmount || 0) - Number(row.paidAmount || 0));
        const canPayItem = isAdminView && selectedRunStatus === 'APPROVED' && remainingAmount > 0;
        if (!canPayItem) return '-';
        return (
          <Button size="sm" variant="success" onClick={() => openPayItemModal(row)} disabled={busy}>
            {t("To'lash")}
          </Button>
        );
      },
    },
  ];
}

export function createTeacherRatesColumns({
  t,
  formatMoney,
  isAdminView,
  openTeacherRateEditModal,
  handleDeleteTeacherRate,
  toDateInput,
}) {
  return [
    {
      key: 'teacher',
      header: t("O'qituvchi"),
      render: (row) => (row.teacher ? `${row.teacher.firstName} ${row.teacher.lastName}` : row.teacherId),
    },
    { key: 'subject', header: t('Fan'), render: (row) => row.subject?.name || '-' },
    { key: 'ratePerHour', header: t('Soat narxi'), render: (row) => formatMoney(row.ratePerHour) },
    { key: 'effectiveFrom', header: t('Boshlanish'), render: (row) => toDateInput(row.effectiveFrom) },
    { key: 'effectiveTo', header: t('Tugash'), render: (row) => toDateInput(row.effectiveTo) || '-' },
    {
      key: 'actions',
      header: t('Amallar'),
      render: (row) => (
        isAdminView ? (
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="secondary" onClick={() => openTeacherRateEditModal(row)}>
              {t('Tahrirlash')}
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleDeleteTeacherRate(row.id)}>
              {t("O'chirish")}
            </Button>
          </div>
        ) : (
          '-'
        )
      ),
    },
  ];
}

export function createSubjectRatesColumns({
  t,
  formatMoney,
  isAdminView,
  openSubjectRateEditModal,
  handleDeleteSubjectRate,
  toDateInput,
}) {
  return [
    { key: 'subject', header: t('Fan'), render: (row) => row.subject?.name || '-' },
    { key: 'ratePerHour', header: t('Soat narxi'), render: (row) => formatMoney(row.ratePerHour) },
    { key: 'effectiveFrom', header: t('Boshlanish'), render: (row) => toDateInput(row.effectiveFrom) },
    { key: 'effectiveTo', header: t('Tugash'), render: (row) => toDateInput(row.effectiveTo) || '-' },
    {
      key: 'actions',
      header: t('Amallar'),
      render: (row) => (
        isAdminView ? (
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="secondary" onClick={() => openSubjectRateEditModal(row)}>
              {t('Tahrirlash')}
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleDeleteSubjectRate(row.id)}>
              {t("O'chirish")}
            </Button>
          </div>
        ) : (
          '-'
        )
      ),
    },
  ];
}

export function createPayrollEmployeeColumns({
  t,
  formatMoney,
  isAdminView,
  busy,
  openEmployeeConfigModal,
}) {
  return [
    {
      key: 'employee',
      header: t('Xodim'),
      render: (row) => formatEmployeeConfigName(row),
    },
    {
      key: 'kind',
      header: t('Turi'),
      render: (row) => row.kind || '-',
    },
    {
      key: 'payrollMode',
      header: t('Oylik rejimi'),
      render: (row) => renderStatusPill(row.payrollMode, t),
    },
    {
      key: 'fixedSalaryAmount',
      header: t('Oklad'),
      render: (row) => formatMoney(row.fixedSalaryAmount),
    },
    {
      key: 'isPayrollEligible',
      header: t("Oylikka kiradi"),
      render: (row) => (row.isPayrollEligible ? t('Ha') : t("Yo'q")),
    },
    {
      key: 'employmentStatus',
      header: t('Bandlik'),
      render: (row) => renderStatusPill(row.employmentStatus, t),
    },
    {
      key: 'note',
      header: t('Izoh'),
      render: (row) => row.note || '-',
    },
    {
      key: 'actions',
      header: t('Amallar'),
      render: (row) => (
        isAdminView ? (
          <Button size="sm" variant="secondary" onClick={() => openEmployeeConfigModal(row)} disabled={busy}>
            {t('Tahrirlash')}
          </Button>
        ) : (
          '-'
        )
      ),
    },
  ];
}
