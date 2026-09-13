import { describe, expect, it } from 'vitest';
import {
  LARGE_FILE_WARNING_BYTES,
  RECOMMENDED_MAX_BYTES
} from '../../extension/shared/src/shared/constants';
import { getFileSizeDecision } from '../../extension/shared/src/viewer/state/file-size-policy';

describe('file-size-policy', () => {
  it.each([
    [0, 'none'],
    [50 * 1024 * 1024, 'subtle'],
    [LARGE_FILE_WARNING_BYTES - 1, 'subtle'],
    [LARGE_FILE_WARNING_BYTES, 'large'],
    [RECOMMENDED_MAX_BYTES, 'large'],
    [RECOMMENDED_MAX_BYTES + 1, 'oversized'],
    [null, 'none']
  ] as const)('classifies %s bytes as %s', (size, decision) => {
    expect(getFileSizeDecision(size).kind).toBe(decision);
  });

  it('returns a subtle status for files from 50 MB up to the warning threshold', () => {
    expect(getFileSizeDecision(50 * 1024 * 1024)).toMatchObject({
      kind: 'subtle',
      statusLabel: 'Large file'
    });
  });

  it('returns the required standard warning copy', () => {
    expect(getFileSizeDecision(LARGE_FILE_WARNING_BYTES)).toMatchObject({
      kind: 'large',
      title: 'Large file',
      message:
        'This is a large file. Preparing the table may use significant memory and can make the browser temporarily unresponsive.',
      confirmLabel: 'Open table'
    });
  });

  it('returns the required oversized warning copy', () => {
    expect(getFileSizeDecision(RECOMMENDED_MAX_BYTES + 1)).toMatchObject({
      kind: 'oversized',
      title: 'Recommended limit exceeded',
      message:
        "This file is larger than Rowser's recommended 512 MB limit. Table mode may fail because of browser memory limits.",
      confirmLabel: 'Open anyway'
    });
  });
});
