// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DataTable } from '../../extension/shared/src/viewer/components/DataTable';
import { Pagination } from '../../extension/shared/src/viewer/components/Pagination';
import type { PageRequest, TablePage } from '../../extension/shared/src/viewer/engine/engine-types';

const basePage: TablePage = {
  columns: ['name', 'score', 'note'],
  rows: [
    { name: 'Ada', score: 10, note: '' },
    { name: 'Linus', score: null, note: 'kernel' }
  ],
  page: 0,
  pageSize: 100,
  filteredRowCount: 2
};

const baseRequest: PageRequest = {
  page: 0,
  pageSize: 100,
  search: '',
  sort: null
};

afterEach(() => {
  cleanup();
});

describe('DataTable', () => {
  test('renders null cells distinctly from empty strings', () => {
    render(<DataTable page={basePage} sort={null} onSortChange={() => undefined} />);

    expect(screen.getByRole('cell', { name: 'NULL' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'kernel' })).toBeTruthy();
  });

  test('cycles a column sort through ascending, descending, and clear', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const { rerender } = render(<DataTable page={basePage} sort={null} onSortChange={onSortChange} />);

    await user.click(screen.getByRole('button', { name: 'name' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ column: 'name', direction: 'asc' });

    rerender(
      <DataTable
        page={basePage}
        sort={{ column: 'name', direction: 'asc' }}
        onSortChange={onSortChange}
      />
    );
    await user.click(screen.getByRole('button', { name: /name/ }));
    expect(onSortChange).toHaveBeenLastCalledWith({ column: 'name', direction: 'desc' });

    rerender(
      <DataTable
        page={basePage}
        sort={{ column: 'name', direction: 'desc' }}
        onSortChange={onSortChange}
      />
    );
    await user.click(screen.getByRole('button', { name: /name/ }));
    expect(onSortChange).toHaveBeenLastCalledWith(null);
  });
});

describe('Pagination', () => {
  test('disables boundary buttons and reports the current row range', () => {
    render(
      <Pagination
        page={{ ...basePage, filteredRowCount: 120 }}
        request={{ ...baseRequest, page: 0, pageSize: 50 }}
        onRequestChange={() => undefined}
      />
    );

    expect(screen.getByText('1-50 of 120')).toBeTruthy();
    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Prev' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled')).toBe(false);
  });

  test('moves pages and resets to the first page when page size changes', async () => {
    const user = userEvent.setup();
    const onRequestChange = vi.fn();
    render(
      <Pagination
        page={{ ...basePage, filteredRowCount: 120 }}
        request={{ ...baseRequest, page: 1, pageSize: 50, search: 'ada' }}
        onRequestChange={onRequestChange}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onRequestChange).toHaveBeenLastCalledWith({
      ...baseRequest,
      page: 2,
      pageSize: 50,
      search: 'ada'
    });

    await user.selectOptions(screen.getByRole('combobox'), '250');
    expect(onRequestChange).toHaveBeenLastCalledWith({
      ...baseRequest,
      page: 0,
      pageSize: 250,
      search: 'ada'
    });
  });
});
