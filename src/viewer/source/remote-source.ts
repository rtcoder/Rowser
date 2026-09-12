import { formatHintFromName, sourceNameFromUrl } from './source-name';
import type { RowserSource } from './source-types';

export async function loadRemoteSource(url: string, signal: AbortSignal): Promise<RowserSource> {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    redirect: 'follow',
    signal
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText || 'Remote source failed'}`);
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error('Empty file');
  }

  const name = sourceNameFromUrl(url);

  return {
    kind: 'remote',
    name,
    size: blob.size,
    formatHint: formatHintFromName(name),
    blob,
    originalUrl: url
  };
}
