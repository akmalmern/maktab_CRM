import { useTranslation } from 'react-i18next';
import { translateText } from '../../lib/i18nHelpers';
import { cn } from './utils';

export default function DataTable({
  columns,
  rows,
  rowKey = 'id',
  emptyText = "Ma'lumot topilmadi",
  stickyHeader = false,
  maxHeightClassName = '',
}) {
  const { t } = useTranslation();

  return (
    <div className={cn('overflow-auto rounded-lg border border-slate-200', maxHeightClassName)}>
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-3 py-2 text-left',
                  stickyHeader && 'sticky top-0 z-10 bg-slate-50',
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
              <tr key={row[rowKey]} className="border-b border-slate-100">
                {columns.map((column) => (
                  <td key={column.key} className={`px-3 py-2 ${column.cellClassName || ''}`}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-3 py-4 text-center text-slate-500" colSpan={columns.length}>
                {translateText(t, emptyText)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
