import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useAppSelector } from '../../../../../app/hooks';
import { Button, Card } from '../../../../../components/ui';
import { getErrorMessage } from '../../../../../lib/apiClient';
import { useGetTeachersQuery } from '../../../../../services/api/peopleApi';
import {
  useCreatePayrollAdvanceMutation,
  useDeletePayrollAdvanceMutation,
  useGetPayrollAdvancesQuery,
} from '../../../../../services/api/payrollApi';
import { PayrollAdvancesPanel } from '../payroll/SettingsPanels';

function getCurrentMonthKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function resolveLocale(language) {
  if (language === 'ru') return 'ru-RU';
  if (language === 'en') return 'en-US';
  return 'uz-UZ';
}

function formatDateTimeRaw(value, locale = 'uz-UZ') {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoneyRaw(value, locale = 'uz-UZ') {
  const n = Number(value || 0);
  return new Intl.NumberFormat(locale).format(Number.isFinite(n) ? n : 0);
}

function formatPersonLabel(person, fallback = '') {
  if (!person) return fallback;
  const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();
  const username = person.user?.username || '';
  if (fullName && username) return `${fullName} (@${username})`;
  return fullName || (username ? `@${username}` : fallback);
}

function formatOwnerName({ teacher, employee, fallbackName = '', fallbackId = '' }) {
  return (
    formatPersonLabel(teacher, '') ||
    formatPersonLabel(employee, '') ||
    fallbackName ||
    fallbackId ||
    '-'
  );
}

const DEFAULT_ADVANCE_FILTERS = { page: 1, limit: 20, periodMonth: '' };

export default function PayrollAdvancesManager() {
  const { t, i18n } = useTranslation();
  const role = useAppSelector((state) => state.auth.role);
  const isAdminView = role === 'ADMIN';
  const locale = resolveLocale(i18n.language);

  const [advanceFilters, setAdvanceFilters] = useState({
    ...DEFAULT_ADVANCE_FILTERS,
    periodMonth: getCurrentMonthKey(),
  });
  const [advanceForm, setAdvanceForm] = useState({
    periodMonth: getCurrentMonthKey(),
    teacherId: '',
    amount: '',
    paidAt: '',
    note: '',
  });

  const teachersQuery = useGetTeachersQuery(
    { page: 1, limit: 100, filter: 'all', sort: 'name:asc' },
    { skip: !isAdminView },
  );
  const payrollAdvancesQuery = useGetPayrollAdvancesQuery({
    page: advanceFilters.page,
    limit: advanceFilters.limit,
    ...(advanceFilters.periodMonth ? { periodMonth: advanceFilters.periodMonth } : {}),
  });
  const [createPayrollAdvance, createAdvanceState] = useCreatePayrollAdvanceMutation();
  const [deletePayrollAdvance, deleteAdvanceState] = useDeletePayrollAdvanceMutation();

  const busy = createAdvanceState.isLoading || deleteAdvanceState.isLoading;
  const advances = payrollAdvancesQuery.data?.advances || [];
  const advancesState = {
    loading: payrollAdvancesQuery.isLoading || payrollAdvancesQuery.isFetching,
    error: payrollAdvancesQuery.error?.message || null,
    page: payrollAdvancesQuery.data?.page || advanceFilters.page,
    pages: payrollAdvancesQuery.data?.pages || 1,
    total: payrollAdvancesQuery.data?.total || 0,
  };

  const teachers = useMemo(() => teachersQuery.data?.teachers || [], [teachersQuery.data?.teachers]);
  const teacherTotal = Number(teachersQuery.data?.total || 0);
  const teacherComboboxOptions = useMemo(
    () =>
      teachers.map((teacher) => ({
        value: teacher.id,
        label: formatPersonLabel(teacher, teacher.id),
        searchText: `${teacher.firstName || ''} ${teacher.lastName || ''} ${teacher.user?.username || ''}`,
      })),
    [teachers],
  );

  const formatMoney = useCallback((value) => `${formatMoneyRaw(value, locale)} ${t("so'm")}`, [locale, t]);
  const formatDateTime = useCallback((value) => formatDateTimeRaw(value, locale), [locale]);

  async function handleCreateAdvance() {
    if (!advanceForm.teacherId || !advanceForm.amount) {
      toast.error(t("O'qituvchi va summa majburiy"));
      return;
    }
    try {
      await createPayrollAdvance({
        periodMonth: advanceForm.periodMonth,
        teacherId: advanceForm.teacherId,
        amount: Number(advanceForm.amount),
        ...(advanceForm.paidAt ? { paidAt: advanceForm.paidAt } : {}),
        ...(advanceForm.note ? { note: advanceForm.note } : {}),
      }).unwrap();
      toast.success(t("Avans qo'shildi"));
      setAdvanceForm((prev) => ({ ...prev, amount: '', note: '' }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const handleDeleteAdvance = useCallback(async (advanceId) => {
    const ok = window.confirm(t("Avans yozuvini o'chirmoqchimisiz?"));
    if (!ok) return;
    try {
      await deletePayrollAdvance(advanceId).unwrap();
      toast.success(t("Avans o'chirildi"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [deletePayrollAdvance, t]);

  const advanceColumns = useMemo(
    () => [
      { key: 'periodMonth', header: t('Oy'), render: (row) => row.periodMonth || '-' },
      {
        key: 'owner',
        header: t('Xodim'),
        render: (row) =>
          formatOwnerName({
            teacher: row.teacher,
            employee: row.employee,
            fallbackId: row.teacherId || row.employeeId || '',
          }),
      },
      { key: 'amount', header: t('Avans summasi'), render: (row) => formatMoney(row.amount) },
      { key: 'paidAt', header: t('Berilgan sana'), render: (row) => formatDateTime(row.paidAt) },
      { key: 'note', header: t('Izoh'), render: (row) => row.note || '-' },
      {
        key: 'actions',
        header: t('Amallar'),
        render: (row) =>
          isAdminView ? (
            <Button size="sm" variant="danger" onClick={() => handleDeleteAdvance(row.id)} disabled={busy}>
              {t("O'chirish")}
            </Button>
          ) : (
            '-'
          ),
      },
    ],
    [busy, formatDateTime, formatMoney, handleDeleteAdvance, isAdminView, t],
  );

  if (!isAdminView) {
    return (
      <Card title={t("Avans to'lovlar")}>
        <p className="text-sm text-slate-600">{t("Avans boshqaruvi faqat admin rolida ochiq.")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {teacherTotal > teachers.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t("O'qituvchilar ro'yxati qisman yuklandi. Qidiruvda ba'zi ustozlar chiqmasligi mumkin.")}
        </div>
      ) : null}

      <PayrollAdvancesPanel
        tab="settings"
        settingsTab="advances"
        isManagerView={false}
        busy={busy}
        advanceForm={advanceForm}
        setAdvanceForm={setAdvanceForm}
        teacherComboboxOptions={teacherComboboxOptions}
        handleCreateAdvance={handleCreateAdvance}
        advanceFilters={advanceFilters}
        setAdvanceFilters={setAdvanceFilters}
        payrollAdvancesQuery={payrollAdvancesQuery}
        advancesState={advancesState}
        advanceColumns={advanceColumns}
        advances={advances}
      />
    </div>
  );
}
