import { Button, DataTable, Input, Modal, StateView } from '../../../../components/ui';

function FieldLabel({ children }) {
  return (
    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
      {children}
    </span>
  );
}

export default function ClassroomStudentsModal({
  t,
  classroom,
  open,
  searchValue,
  studentsState,
  removeLoading,
  onClose,
  onSearchChange,
  onSearchSubmit,
  onPageChange,
  onOpenStudentDetail,
  onRequestRemoveStudent,
}) {
  const rows = studentsState.rows || [];
  const columns = [
    {
      key: 'fullName',
      header: t('F.I.SH'),
      render: (student) => `${student.firstName} ${student.lastName}`,
    },
    {
      key: 'username',
      header: t('Username'),
      render: (student) => student.user?.username || '-',
    },
    {
      key: 'phone',
      header: t('Telefon'),
      render: (student) => student.user?.phone || '-',
    },
    {
      key: 'actions',
      header: t('Amallar'),
      render: (student) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="indigo"
            className="min-w-24"
            onClick={() => onOpenStudentDetail(student.id)}
          >
            {t('Batafsil')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            className="min-w-32"
            disabled={removeLoading}
            onClick={() => onRequestRemoveStudent(student)}
          >
            {t('Sinfdan chiqarish')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={classroom ? `${classroom.name} (${classroom.academicYear})` : t("Sinf o'quvchilari")}
      subtitle={
        classroom
          ? t("O'quvchilar soni: {{count}} ta", { count: classroom.studentCount || 0 })
          : null
      }
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-100">
          {t('Student profilini saqlagan holda bu sinfdagi aktiv biriktiruv yopiladi.')}
        </div>

        <form
          className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3"
          onSubmit={onSearchSubmit}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <FieldLabel>{t("O'quvchi qidiruvi")}</FieldLabel>
              <Input
                type="text"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={t('Ism, familiya, username yoki telefon')}
              />
            </div>
            <div className="sm:self-end">
              <Button type="submit" variant="secondary" disabled={studentsState.loading} className="w-full sm:w-auto">
                {t('Qidirish')}
              </Button>
            </div>
          </div>
        </form>

        {studentsState.loading ? <StateView type="loading" /> : null}
        {!studentsState.loading && studentsState.error ? (
          <StateView type="error" description={studentsState.error} />
        ) : null}

        {!studentsState.loading && !studentsState.error && rows.length ? (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              stickyHeader
              stickyFirstColumn
              maxHeightClassName="max-h-80"
            />
            <div className="flex flex-col items-start justify-between gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 sm:flex-row sm:items-center">
              <span className="text-xs text-slate-600">
                {t('Jami')}: <b className="text-slate-900">{studentsState.total}</b> {t('ta')} | {t('Sahifa')}:{' '}
                <b className="text-slate-900">{studentsState.page}</b> / {studentsState.pages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={studentsState.loading || studentsState.page <= 1}
                  onClick={() => onPageChange(Math.max(1, studentsState.page - 1))}
                >
                  {t('Oldingi')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={studentsState.loading || studentsState.page >= studentsState.pages}
                  onClick={() => onPageChange(Math.min(studentsState.pages, studentsState.page + 1))}
                >
                  {t('Keyingi')}
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {!studentsState.loading && !studentsState.error && !rows.length ? (
          <StateView type="empty" description={t("Bu sinfda hozircha student yo'q.")} />
        ) : null}
      </div>
    </Modal>
  );
}
