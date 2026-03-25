import {
  Button,
  FilterToolbar,
  FilterToolbarItem,
  Select,
} from '../../../../components/ui';

export function ManagerDebtorsFilters({
  t,
  classrooms,
  query,
  setQuery,
  resetQuery,
  reloadDebtors,
}) {
  return (
    <FilterToolbar
      className="mt-4 mb-0"
      gridClassName="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
      onReset={resetQuery}
      resetLabel={t('Filterlarni tozalash')}
      resetDisabled={query.classroomId === (classrooms?.[0]?.id || '')}
      actions={
        <Button variant="secondary" size="sm" onClick={reloadDebtors}>
          {t('Yangilash')}
        </Button>
      }
    >
      <FilterToolbarItem label={t('Sinf filtri')}>
        <Select
          value={query.classroomId}
          onChange={(event) =>
            setQuery((prev) => ({ ...prev, classroomId: event.target.value, page: 1 }))
          }
        >
          {classrooms.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>
              {classroom.name} ({classroom.academicYear})
            </option>
          ))}
        </Select>
      </FilterToolbarItem>
    </FilterToolbar>
  );
}
