export type SourceKind = 'remote' | 'local';
export type SourceFormatHint = 'csv' | 'tsv' | 'unknown';

export interface RowserSource {
  kind: SourceKind;
  name: string;
  size: number | null;
  formatHint: SourceFormatHint;
  blob: Blob;
  originalUrl?: string;
}
