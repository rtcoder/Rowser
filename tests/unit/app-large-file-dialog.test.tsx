// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { LARGE_FILE_WARNING_BYTES, RECOMMENDED_MAX_BYTES } from '../../extension/shared/src/shared/constants';
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

describe('App large file dialog', () => {
  test('shows the standard warning before importing files at 200 MB', async () => {
    const user = userEvent.setup();
    const file = sizedCsvFile('large.csv', LARGE_FILE_WARNING_BYTES);
    window.history.replaceState(null, '', '/viewer.html?mode=local');
    render(<App />);

    await user.upload(screen.getByLabelText('Choose CSV or TSV file'), file);

    expect(await screen.findByRole('heading', { name: 'Large file' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open table' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show raw' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  test('can open an oversized local file directly in raw mode', async () => {
    const user = userEvent.setup();
    const file = sizedCsvFile('oversized.csv', RECOMMENDED_MAX_BYTES + 1);
    window.history.replaceState(null, '', '/viewer.html?mode=local');
    render(<App />);

    await user.upload(screen.getByLabelText('Choose CSV or TSV file'), file);
    await user.click(await screen.findByRole('button', { name: 'Show raw' }));

    expect(await screen.findByText(/name/)).toBeTruthy();
    expect(screen.getByText(/Ada/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Raw' }).className).toBe('is-active');
  });
});

function sizedCsvFile(name: string, size: number): File {
  const file = new File(['name\nAda\n'], name, { type: 'text/csv' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}
