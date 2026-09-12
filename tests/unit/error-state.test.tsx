// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { ErrorState } from '../../extension/shared/src/viewer/components/ErrorState';

afterEach(() => {
  cleanup();
});

describe('ErrorState', () => {
  test('renders technical detail without a recovery action by default', () => {
    render(<ErrorState title="Network request failed" detail="Failed to fetch" />);

    expect(screen.getByRole('heading', { name: 'Network request failed' })).toBeTruthy();
    expect(screen.getByText('Failed to fetch')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open another file' })).toBeNull();
  });

  test('calls the recovery action from Open another file', async () => {
    const user = userEvent.setup();
    const onOpenAnotherFile = vi.fn();
    render(
      <ErrorState
        title="Table import failed"
        detail="Could not parse source"
        onOpenAnotherFile={onOpenAnotherFile}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Open another file' }));

    expect(onOpenAnotherFile).toHaveBeenCalledTimes(1);
  });

  test('calls the raw fallback action when available', async () => {
    const user = userEvent.setup();
    const onShowRaw = vi.fn();
    render(<ErrorState title="Table import failed" detail="Could not parse source" onShowRaw={onShowRaw} />);

    await user.click(screen.getByRole('button', { name: 'Show raw' }));

    expect(onShowRaw).toHaveBeenCalledTimes(1);
  });
});
