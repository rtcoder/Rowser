import { describe, expect, it } from 'vitest';
import { classifySourceError } from '../../extension/shared/src/viewer/source/source-errors';

describe('source-errors', () => {
  it.each([
    [new Error('Empty file'), 'Empty file'],
    [new Error('Unsupported local extension'), 'Unsupported local extension'],
    [new Error('Expired automatic-navigation token'), 'Expired automatic-navigation token'],
    [new Error('HTTP 401: Unauthorized'), 'HTTP 401'],
    [new Error('HTTP 403: Forbidden'), 'HTTP 403'],
    [new Error('HTTP 404: Not Found'), 'HTTP 404'],
    [new Error('HTTP 503: Service Unavailable'), 'HTTP 5xx']
  ])('maps %s to a specific title', (error, title) => {
    expect(classifySourceError(error)).toEqual({
      title,
      detail: error.message
    });
  });

  it('maps generic browser failures to a network title', () => {
    expect(classifySourceError(new TypeError('Failed to fetch'))).toEqual({
      title: 'Network request failed',
      detail: 'Failed to fetch'
    });
  });
});
