// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { App } from '../../extension/shared/src/viewer/App';

vi.mock('../../extension/shared/src/viewer/engine/duckdb-engine', () => ({
  createDuckDbTableEngine: () => ({
    importSource: vi.fn().mockRejectedValue(new Error('CSV parse exploded')),
    getPage: vi.fn(),
    dispose: vi.fn().mockResolvedValue(undefined)
  })
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('App table error recovery', () => {
  test('keeps raw source available when table import fails', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/viewer.html?mode=local');
    render(<App />);

    await user.upload(
      screen.getByLabelText('Choose CSV or TSV file'),
      new File(['name,score\nBroken,1\n'], 'broken.csv', { type: 'text/csv' })
    );

    await screen.findByRole('heading', { name: 'Table import failed' });
    expect(screen.getByText('CSV parse exploded')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Show raw' }));

    await waitFor(() => {
      expect(screen.getByText(/name,score/)).toBeTruthy();
      expect(screen.getByText(/Broken,1/)).toBeTruthy();
    });
  });
});
