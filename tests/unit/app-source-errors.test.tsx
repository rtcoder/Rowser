// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test } from 'vitest';
import { App } from '../../extension/shared/src/viewer/App';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('App source loading errors', () => {
  test('shows an explicit empty-file error for local files', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/viewer.html?mode=local');
    render(<App />);

    await user.upload(
      screen.getByLabelText('Choose CSV or TSV file'),
      new File([], 'empty.csv', { type: 'text/csv' })
    );

    expect(await screen.findByRole('heading', { name: 'Empty file' })).toBeTruthy();
    expect(screen.getAllByText('Empty file')).toHaveLength(2);
  });

  test('shows an explicit unsupported-extension error for local files', async () => {
    window.history.replaceState(null, '', '/viewer.html?mode=local');
    render(<App />);
    const file = new File(['{}'], 'data.json', { type: 'application/json' });

    fireEvent.drop(screen.getByRole('main'), {
      dataTransfer: {
        files: {
          item: (index: number) => (index === 0 ? file : null)
        }
      }
    });

    expect(await screen.findByRole('heading', { name: 'Unsupported local extension' })).toBeTruthy();
    expect(screen.getAllByText('Unsupported local extension')).toHaveLength(2);
  });
});
