// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('App large file status', () => {
  test('shows a subtle large-file status below the warning threshold', async () => {
    const user = userEvent.setup();
    const file = new File(['name\nAda\n'], 'large.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 });
    window.history.replaceState(null, '', '/viewer.html?mode=local');
    render(<App />);

    await user.upload(screen.getByLabelText('Choose CSV or TSV file'), file);

    const headerSummary = await screen.findByText(/large\.csv/);
    expect(headerSummary.textContent).toContain('Large file');
    expect(screen.queryByRole('heading', { name: 'Large file' })).toBeNull();
  });
});
