import { Button, Card, DataTable, Input, Select, StateView } from '../../../components/ui';

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
  const sortOptions = [
    { value: 'name:asc', label: 'Ism A-Z' },
    { value: 'name:desc', label: 'Ism Z-A' },
    { value: 'username:asc', label: 'Username A-Z' },
    { value: 'username:desc', label: 'Username Z-A' },
  ];

  if (showSubject) {
    sortOptions.push({ value: 'subject:asc', label: 'Fan A-Z' });
    sortOptions.push({ value: 'subject:desc', label: 'Fan Z-A' });
  }
  if (showClassroom) {
    sortOptions.push({ value: 'classroom:asc', label: 'Sinf A-Z' });
    sortOptions.push({ value: 'classroom:desc', label: 'Sinf Z-A' });
  }

  const columns = [
    {
      key: 'fullName',
      header: 'F.I.SH',
      render: (row) => `${row.firstName} ${row.lastName}`,
    },
    {
      key: 'username',
      header: 'Username',
      render: (row) => row.user?.username || '-',
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (row) => row.user?.phone || '-',
    },
    ...(showSubject
      ? [
          {
            key: 'subject',
            header: 'Fan',
            render: (row) => row.subject?.name || '-',
          },
        ]
      : []),
    ...(showClassroom
      ? [
          {
            key: 'classroom',
            header: 'Sinf',
            render: (row) =>
              row.enrollments?.[0]?.classroom
                ? `${row.enrollments[0].classroom.name} (${row.enrollments[0].classroom.academicYear})`
                : '-',
          },
          {
            key: 'paymentStatus',
            header: "To'lov",
            render: (row) =>
              row.tolovHolati === 'QARZDOR'
                ? `Qarzdor (${row.qarzOylarSoni || 0} oy)`
                : "To'lagan",
          },
        ]
      : []),
    {
      key: 'actions',
      header: 'Amallar',
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="indigo" onClick={() => onOpenDetail(row.id)}>
            Batafsil
          </Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(row.id)}>
            O'chirish
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card
      title={title}
      actions={<span className="text-sm text-slate-500">Sahifa: {page} / {pages || 1}</span>}
    >
      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
        <Input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Qidirish..."
        />
        <Select value={filterValue} onChange={(e) => onFilterChange(e.target.value)}>
          <option value="all">Hammasi</option>
          {filterOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select value={sortValue} onChange={(e) => onSortChange(e.target.value)}>
          {sortOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select
          value={String(pageSize)}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size} ta / sahifa
            </option>
          ))}
        </Select>
      </div>

      {loading && <StateView type="skeleton" />}
      {error && <StateView type="error" description={error} />}

      {!loading && !error && (
        rows.length ? (
          <DataTable
            columns={columns}
            rows={rows}
            stickyHeader
            maxHeightClassName="max-h-[520px]"
          />
        ) : (
          <StateView type="empty" />
        )
      )}

      <div className="mt-3 flex justify-end gap-2">
        <Button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          variant="secondary"
          size="sm"
          disabled={page <= 1}
        >
          Oldingi
        </Button>
        <Button
          onClick={() => onPageChange(Math.min(pages || 1, page + 1))}
          variant="secondary"
          size="sm"
          disabled={page >= (pages || 1)}
        >
          Keyingi
        </Button>
      </div>
    </Card>
  );
}
