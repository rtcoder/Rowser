import { formatHintFromName } from './source-name';
import type { RowserSource } from './source-types';

export function loadLocalSource(file: File): Promise<RowserSource> {
  const formatHint = formatHintFromName(file.name);
  if (formatHint === 'unknown') {
    return Promise.reject(new Error('Unsupported local extension'));
  }

  if (file.size === 0) {
    return Promise.reject(new Error('Empty file'));
  }

  return Promise.resolve({
    kind: 'local',
    name: file.name,
    size: file.size,
    formatHint,
    blob: file
  });
}
