import { describe, expect, it } from 'vitest';
import {
  formatHintFromName,
  sourceNameFromUrl
} from '../../extension/shared/src/viewer/source/source-name';

describe('source-name', () => {
  it.each([
    ['report.csv', 'csv'],
    ['REPORT.CSV', 'csv'],
    ['export.tsv', 'tsv'],
    ['notes.txt', 'unknown']
  ] as const)('detects %s as %s', (name, format) => {
    expect(formatHintFromName(name)).toBe(format);
  });

  it('uses the decoded last path segment as the source name', () => {
    expect(sourceNameFromUrl('https://example.com/files/monthly%20report.csv?download=1')).toBe(
      'monthly report.csv'
    );
  });

  it('falls back to the hostname when URL has no path filename', () => {
    expect(sourceNameFromUrl('https://example.com/')).toBe('example.com');
  });
});
