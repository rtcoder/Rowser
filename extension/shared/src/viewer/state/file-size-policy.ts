import { LARGE_FILE_WARNING_BYTES, RECOMMENDED_MAX_BYTES } from '../../shared/constants';

export type FileSizeDecision =
  | { kind: 'none' }
  | {
      kind: 'large' | 'oversized';
      title: string;
      message: string;
      confirmLabel: string;
    };

export function getFileSizeDecision(size: number | null): FileSizeDecision {
  if (size == null || size < LARGE_FILE_WARNING_BYTES) {
    return { kind: 'none' };
  }

  if (size <= RECOMMENDED_MAX_BYTES) {
    return {
      kind: 'large',
      title: 'Large file',
      message:
        'This is a large file. Preparing the table may use significant memory and can make the browser temporarily unresponsive.',
      confirmLabel: 'Open table'
    };
  }

  return {
    kind: 'oversized',
    title: 'Recommended limit exceeded',
    message:
      "This file is larger than Rowser's recommended 512 MB limit. Table mode may fail because of browser memory limits.",
    confirmLabel: 'Open anyway'
  };
}
