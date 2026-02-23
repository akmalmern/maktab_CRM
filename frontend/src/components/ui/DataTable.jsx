import { useTranslation } from 'react-i18next';
import { translateText } from '../../lib/i18nHelpers';
import { cn } from './utils';

export default function DataTable({
  columns,
  rows,
  rowKey = 'id',
  emptyText = "Ma'lumot topilmadi",
  stickyHeader = false,
  stickyFirstColumn = false,
  density = 'normal',
  maxHeightClassName = '',
}) {
  const { t } = useTranslation();
  const normalizedDensity = density === 'dense' ? 'compact' : density;
  const densityClasses = {
    compact: {
      header: 'px-2.5 py-2 text-[11px]',
      cell: 'px-2.5 py-2',
      empty: 'px-3 py-3',
    },
    normal: {
      header: 'px-3 py-2.5 text-xs',
      cell: 'px-3 py-2.5',
      empty: 'px-3 py-4',
    },
    comfortable: {
      header: 'px-4 py-3 text-xs',
      cell: 'px-4 py-3',
      empty: 'px-4 py-5',
    },
  };
  const currentDensity = densityClasses[normalizedDensity] || densityClasses.normal;

  return (
    <div
      className={cn(
        'overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-200/40',
        maxHeightClassName,
      )}
    >
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50/90 text-slate-600">
          <tr>
            {columns.map((column, columnIndex) => (
              <th
                key={column.key}
                className={cn(
                  `text-left font-semibold uppercase tracking-wide ${currentDensity.header}`,
                  stickyHeader && 'sticky top-0 z-10 bg-slate-50/95 backdrop-blur',
                  stickyFirstColumn &&
                    columnIndex === 0 &&
                    'sticky left-0 z-20 bg-slate-50/95 shadow-[1px_0_0_0_rgba(148,163,184,0.2)] backdrop-blur',
                  column.headerClassName || '',
                )}
              >
                {translateText(t, column.header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr
                key={row[rowKey]}
                className="group border-b border-slate-100 transition-colors hover:bg-slate-50/70"
              >
                {columns.map((column, columnIndex) => (
                  <td
                    key={column.key}
                    className={cn(
                      `${currentDensity.cell} align-top`,
                      stickyFirstColumn &&
                        columnIndex === 0 &&
                        'sticky left-0 z-[1] bg-white shadow-[1px_0_0_0_rgba(148,163,184,0.15)] group-hover:bg-slate-50/70',
                      column.cellClassName || '',
                    )}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className={`${currentDensity.empty} text-center text-slate-500`} colSpan={columns.length}>
                {translateText(t, emptyText)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
