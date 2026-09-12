import type { SortSpec, TablePage } from '../engine/engine-types';

interface DataTableProps {
  page: TablePage;
  sort: SortSpec | null;
  onSortChange: (sort: SortSpec | null) => void;
}

export function DataTable({ page, sort, onSortChange }: DataTableProps) {
  return (
    <div className="data-table" role="region" aria-label="CSV table">
      <table>
        <thead>
          <tr>
            {page.columns.map((column) => (
              <th key={column}>
                <button type="button" onClick={() => onSortChange(nextSort(sort, column))}>
                  {column}
                  {sort?.column === column ? <span>{sort.direction === 'asc' ? ' ▲' : ' ▼'}</span> : null}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {page.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {page.columns.map((column) => (
                <td key={column}>{formatCell(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function nextSort(current: SortSpec | null, column: string): SortSpec | null {
  if (current?.column !== column) {
    return { column, direction: 'asc' };
  }

  if (current.direction === 'asc') {
    return { column, direction: 'desc' };
  }

  return null;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  return String(value);
}
