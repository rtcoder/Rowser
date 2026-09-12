import type { PageRequest, TablePage } from '../engine/engine-types';

interface PaginationProps {
  page: TablePage;
  request: PageRequest;
  onRequestChange: (request: PageRequest) => void;
}

const PAGE_SIZES = [50, 100, 250, 500] as const;

export function Pagination({ page, request, onRequestChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(page.filteredRowCount / request.pageSize));
  const firstRow = page.filteredRowCount === 0 ? 0 : request.page * request.pageSize + 1;
  const lastRow = Math.min(page.filteredRowCount, (request.page + 1) * request.pageSize);

  return (
    <footer className="pagination">
      <span>
        {firstRow}-{lastRow} of {page.filteredRowCount}
      </span>
      <button
        type="button"
        disabled={request.page === 0}
        onClick={() => onRequestChange({ ...request, page: request.page - 1 })}
      >
        Prev
      </button>
      <span>
        {request.page + 1} / {pageCount}
      </span>
      <button
        type="button"
        disabled={request.page >= pageCount - 1}
        onClick={() => onRequestChange({ ...request, page: request.page + 1 })}
      >
        Next
      </button>
      <select
        value={request.pageSize}
        onChange={(event) =>
          onRequestChange({
            ...request,
            page: 0,
            pageSize: Number(event.currentTarget.value) as PageRequest['pageSize']
          })
        }
      >
        {PAGE_SIZES.map((pageSize) => (
          <option key={pageSize} value={pageSize}>
            {pageSize}
          </option>
        ))}
      </select>
    </footer>
  );
}
