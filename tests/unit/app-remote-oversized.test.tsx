// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { App } from '../../extension/shared/src/viewer/App';
import {
  loadRemoteSource,
  UnknownLengthLimitExceededError
} from '../../extension/shared/src/viewer/source/remote-source';

const loadRemoteSourceMock = vi.hoisted(() => vi.fn());

vi.mock('../../extension/shared/src/viewer/source/remote-source', () => ({
  loadRemoteSource: loadRemoteSourceMock,
  UnknownLengthLimitExceededError: class UnknownLengthLimitExceededError extends Error {
    readonly name = 'UnknownLengthLimitExceededError';

    constructor(
      readonly sourceUrl: string,
      readonly sourceName: string
    ) {
      super(
        "This file is larger than Rowser's recommended 512 MB limit. Table mode may fail because of browser memory limits."
      );
    }
  }
}));

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
  vi.mocked(loadRemoteSource).mockReset();
});

describe('App remote oversized source decisions', () => {
  test('asks before continuing when an unknown-length remote source exceeds the recommended limit', async () => {
    const user = userEvent.setup();
    const sourceUrl = 'https://example.com/large.csv';
    vi.mocked(loadRemoteSource)
      .mockRejectedValueOnce(new UnknownLengthLimitExceededError(sourceUrl, 'large.csv'))
      .mockResolvedValueOnce({
        kind: 'remote',
        name: 'large.csv',
        size: 512 * 1024 * 1024 + 1,
        formatHint: 'csv',
        blob: new Blob(['name\nAda\n']),
        originalUrl: sourceUrl
      });
    window.history.replaceState(null, '', `/viewer.html?url=${encodeURIComponent(sourceUrl)}`);

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Recommended limit exceeded' })).toBeTruthy();
    expect(screen.getByText('large.csv')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Open anyway' }));

    expect(await screen.findByRole('region', { name: 'CSV table' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Ada' })).toBeTruthy();
    expect(vi.mocked(loadRemoteSource).mock.calls[1]?.[2]).toEqual({
      allowUnknownLengthOverLimit: true
    });
  });

  test('can refetch an unknown-length oversized source directly into raw mode', async () => {
    const user = userEvent.setup();
    const sourceUrl = 'https://example.com/large.csv';
    vi.mocked(loadRemoteSource)
      .mockRejectedValueOnce(new UnknownLengthLimitExceededError(sourceUrl, 'large.csv'))
      .mockResolvedValueOnce({
        kind: 'remote',
        name: 'large.csv',
        size: 512 * 1024 * 1024 + 1,
        formatHint: 'csv',
        blob: new Blob(['name\nAda\n']),
        originalUrl: sourceUrl
      });
    window.history.replaceState(null, '', `/viewer.html?url=${encodeURIComponent(sourceUrl)}`);

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Recommended limit exceeded' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Show raw' }));

    expect(await screen.findByText(/name/)).toBeTruthy();
    expect(screen.getByText(/Ada/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Raw' }).className).toBe('is-active');
    expect(vi.mocked(loadRemoteSource).mock.calls[1]?.[2]).toEqual({
      allowUnknownLengthOverLimit: true
    });
  });
});
