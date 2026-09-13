// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { App } from '../../extension/shared/src/viewer/App';

const importNotice = 'Some column types could not be inferred. Rowser loaded the file as text.';

vi.mock('../../extension/shared/src/viewer/engine/duckdb-engine', () => ({
  createDuckDbTableEngine: () => ({
    importSource: vi.fn().mockResolvedValue({
      columns: [
        { name: '__rowser_rowid', type: 'BIGINT' },
        { name: 'id', type: 'VARCHAR' },
        { name: 'value', type: 'VARCHAR' }
      ],
      rowCount: 2,
      importNotice
    }),
    getPage: vi.fn().mockResolvedValue({
      columns: ['id', 'value'],
      rows: [
        { id: '1', value: '100' },
        { id: '2', value: 'text' }
      ],
      page: 0,
      pageSize: 100,
      filteredRowCount: 2
    }),
    dispose: vi.fn().mockResolvedValue(undefined)
  })
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('App table import notices', () => {
  test('shows a non-blocking notice when the table engine falls back to text columns', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/viewer.html?mode=local');
    render(<App />);

    await user.upload(
      screen.getByLabelText('Choose CSV or TSV file'),
      new File(['id,value\n1,100\n2,text\n'], 'mixed.csv', { type: 'text/csv' })
    );

    expect(await screen.findByText(importNotice)).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'text' })).toBeTruthy();
  });
});
