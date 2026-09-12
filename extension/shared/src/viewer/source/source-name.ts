import type { SourceFormatHint } from './source-types';

export function formatHintFromName(name: string): SourceFormatHint {
  const lowerName = name.toLowerCase();

  if (lowerName.endsWith('.csv')) {
    return 'csv';
  }

  if (lowerName.endsWith('.tsv')) {
    return 'tsv';
  }

  return 'unknown';
}

export function sourceNameFromUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const lastPathSegment = url.pathname.split('/').filter(Boolean).at(-1);
    return lastPathSegment ? decodeURIComponent(lastPathSegment) : url.hostname;
  } catch {
    return rawUrl;
  }
}
