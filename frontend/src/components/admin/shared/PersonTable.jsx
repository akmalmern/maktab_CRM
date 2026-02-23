import {
  Button,
  Card,
  DataTable,
  FilterToolbar,
  FilterToolbarItem,
  Input,
  Select,
  StateView,
  StatusBadge,
} from '../../../components/ui';
import { useTranslation } from 'react-i18next';

export default function PersonTable({
  title,
  rows,
  loading,
  error,
  page,
  pages,
  onPageChange,
  onDelete,
  onOpenDetail,
  showSubject,
  showClassroom,
  searchValue,
  onSearchChange,
  filterValue,
  onFilterChange,
  filterOptions,
  sortValue,
  onSortChange,
  pageSize,
  onPageSizeChange,
}) {
  const { t } = useTranslation();

  const sortOptions = [
    { value: 'name:asc', label: t('Ism A-Z') },
    { value: 'name:desc', label: t('Ism Z-A') },
    { value: 'username:asc', label: t('Username A-Z') },
    { value: 'username:desc', label: t('Username Z-A') },
  ];

  if (showSubject) {
    sortOptions.push({ value: 'subject:asc', label: t('Fan A-Z') });
    sortOptions.push({ value: 'subject:desc', label: t('Fan Z-A') });
  }
  if (showClassroom) {
    sortOptions.push({ value: 'classroom:asc', label: t('Sinf A-Z') });
    sortOptions.push({ value: 'classroom:desc', label: t('Sinf Z-A') });
  }

  const columns = [
    {
      key: 'fullName',
      header: t('F.I.SH'),
      render: (row) => `${row.firstName} ${row.lastName}`,
    },
    {
      key: 'username',
      header: t('Username'),
      render: (row) => row.user?.username || '-',
    },
    {
      key: 'phone',
      header: t('Telefon'),
      render: (row) => row.user?.phone || '-',
    },
    ...(showSubject
      ? [
          {
            key: 'subject',
            header: t('Fan'),
            render: (row) =>
              row.subject?.name
                ? t(row.subject.name, { defaultValue: row.subject.name })
                : '-',
          },
        ]
      : []),
    ...(showClassroom
      ? [
          {
            key: 'classroom',
            header: t('Sinf'),
            render: (row) =>
              row.enrollments?.[0]?.classroom
                ? `${row.enrollments[0].classroom.name} (${row.enrollments[0].classroom.academicYear})`
                : '-',
          },
          {
            key: 'paymentStatus',
            header: t("To'lov"),
            render: (row) =>
              row.tolovHolati === 'QARZDOR' ? (
                <StatusBadge
                  domain="financeDebt"
                  value={row.tolovHolati}
                  count={row.qarzOylarSoni || 0}
                  countTemplate={'Qarzdor ({{count}} oy)'}
                  className="shadow-none"
                  fallbackLabel="Qarzdor"
                />
              ) : (
                <StatusBadge domain="financeDebt" value={row.tolovHolati || 'TOLANGAN'} className="shadow-none" />
              ),
          },
        ]
      : []),
    {
      key: 'actions',
      header: t('Amallar'),
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="indigo" className="min-w-24" onClick={() => onOpenDetail(row.id)}>
            {t('Batafsil')}
          </Button>
          <Button size="sm" variant="danger" className="min-w-24" onClick={() => onDelete(row.id)}>
            {t("O'chirish")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card
      title={title}
      actions={(
        <div className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-sm text-slate-600">
          {t('Sahifa')}: <span className="ml-1 font-semibold text-slate-900">{page}</span>
          <span className="mx-1 text-slate-400">/</span>
          <span>{pages || 1}</span>
        </div>
      )}
    >
      <FilterToolbar
        gridClassName="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
        onReset={() => {
          onSearchChange('');
          onFilterChange('all');
          onSortChange('name:asc');
          onPageSizeChange(10);
        }}
        resetLabel={t('Filterlarni tozalash')}
        resetDisabled={searchValue === '' && filterValue === 'all' && sortValue === 'name:asc' && Number(pageSize) === 10}
      >
        <FilterToolbarItem label={t('Qidiruv')}>
          <Input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('Qidirish...')}
          />
        </FilterToolbarItem>
        <FilterToolbarItem label={t('Filter')}>
          <Select value={filterValue} onChange={(e) => onFilterChange(e.target.value)}>
            <option value="all">{t('Hammasi')}</option>
            {filterOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {t(item.label, { defaultValue: item.label })}
              </option>
            ))}
          </Select>
        </FilterToolbarItem>
        <FilterToolbarItem label={t('Saralash')}>
          <Select value={sortValue} onChange={(e) => onSortChange(e.target.value)}>
            {sortOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </FilterToolbarItem>
        <FilterToolbarItem label={t('Sahifa limiti')}>
          <Select
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {t('{{count}} ta / sahifa', { count: size })}
              </option>
            ))}
          </Select>
        </FilterToolbarItem>
      </FilterToolbar>

      {loading && <StateView type="skeleton" />}
      {error && <StateView type="error" description={error} />}

      {!loading && !error && (
        rows.length ? (
          <DataTable
            columns={columns}
            rows={rows}
            stickyHeader
            stickyFirstColumn
            density="compact"
            maxHeightClassName="max-h-[520px]"
          />
        ) : (
          <StateView type="empty" />
        )
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          variant="secondary"
          size="sm"
          disabled={page <= 1}
        >
          {t('Oldingi')}
        </Button>
        <Button
          onClick={() => onPageChange(Math.min(pages || 1, page + 1))}
          variant="secondary"
          size="sm"
          disabled={page >= (pages || 1)}
        >
          {t('Keyingi')}
        </Button>
      </div>
    </Card>
  );
}
