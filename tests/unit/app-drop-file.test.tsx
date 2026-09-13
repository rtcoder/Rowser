// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { App } from '../../extension/shared/src/viewer/App';

vi.mock('../../extension/shared/src/viewer/engine/duckdb-engine', () => ({
  createDuckDbTableEngine: () => ({
    importSource: vi.fn().mockResolvedValue({
      columns: [
        { name: '__rowser_rowid', type: 'BIGINT' },
        { name: 'name', type: 'VARCHAR' }
      ],
      rowCount: 1
    }),
    getPage: vi.fn().mockResolvedValue({
      columns: ['name'],
      rows: [{ name: 'Ada' }],
      page: 0,
      pageSize: 100,
      filteredRowCount: 1
    }),
    dispose: vi.fn().mockResolvedValue(undefined)
  })
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('App drag and drop', () => {
  test('opens a dropped CSV file in the table viewer', async () => {
    const file = new File(['name\nAda\n'], 'dropped.csv', { type: 'text/csv' });
    window.history.replaceState(null, '', '/viewer.html');
    render(<App />);

    fireEvent.drop(screen.getByRole('main'), {
      dataTransfer: {
        files: {
          item: (index: number) => (index === 0 ? file : null)
        }
      }
    });

    expect(await screen.findByRole('region', { name: 'CSV table' })).toBeTruthy();
    expect(screen.getByText(/dropped\.csv/)).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Ada' })).toBeTruthy();
  });
});
