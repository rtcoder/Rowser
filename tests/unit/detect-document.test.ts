import { describe, expect, it } from 'vitest';
import {
  detectDocument,
  type ResponseMetadata
} from '../../extension/shared/src/background/detect-document';

function response(overrides: Partial<ResponseMetadata>): ResponseMetadata {
  return {
    url: 'https://example.com/data.txt',
    method: 'GET',
    type: 'main_frame',
    responseHeaders: [],
    ...overrides
  };
}

describe('detectDocument', () => {
  it.each([
    ['https://example.com/report.csv', 'csv'],
    ['https://example.com/report.tsv', 'tsv'],
    ['https://example.com/report.CSV', 'csv'],
    ['https://example.com/report.csv?download=1', 'csv']
  ] as const)('opens %s from the URL extension', (url, format) => {
    expect(detectDocument(response({ url }))).toMatchObject({
      shouldOpen: true,
      format
    });
  });

  it.each([
    ['text/csv; charset=utf-8', 'csv'],
    ['text/tab-separated-values', 'tsv'],
    ['application/csv', 'csv'],
    ['text/tsv', 'tsv']
  ] as const)('opens MIME type %s without a file extension', (contentType, format) => {
    expect(
      detectDocument(
        response({
          responseHeaders: [{ name: 'Content-Type', value: contentType }]
        })
      )
    ).toMatchObject({
      shouldOpen: true,
      format,
      mimeType: contentType
    });
  });

  it('allows inline content disposition and extracts filename and content length', () => {
    expect(
      detectDocument(
        response({
          url: 'https://example.com/download',
          responseHeaders: [
            { name: 'Content-Type', value: 'text/csv' },
            { name: 'Content-Disposition', value: 'inline; filename="report.csv"' },
            { name: 'Content-Length', value: '1234' }
          ]
        })
      )
    ).toEqual({
      shouldOpen: true,
      format: 'csv',
      mimeType: 'text/csv',
      contentLength: 1234,
      fileName: 'report.csv'
    });
  });

  it.each([
    response({
      url: 'https://example.com/report.csv',
      responseHeaders: [{ name: 'Content-Disposition', value: 'attachment; filename=report.csv' }]
    }),
    response({ url: 'https://example.com/report.csv', method: 'POST' }),
    response({ url: 'https://example.com/report.csv', type: 'sub_frame' }),
    response({
      url: 'https://example.com/file.txt',
      responseHeaders: [{ name: 'Content-Type', value: 'text/plain' }]
    })
  ])('does not open ineligible responses %#', (input) => {
    expect(detectDocument(input)).toMatchObject({ shouldOpen: false });
  });
});
