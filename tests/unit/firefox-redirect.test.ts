import { describe, expect, it } from 'vitest';
import {
  buildFirefoxViewerRedirect,
  type FirefoxResponseDetails
} from '../../extension/firefox/src/background/firefox-redirect';

function response(overrides: Partial<FirefoxResponseDetails>): FirefoxResponseDetails {
  return {
    url: 'https://example.com/data.txt',
    method: 'GET',
    type: 'main_frame',
    responseHeaders: [],
    ...overrides
  };
}

describe('buildFirefoxViewerRedirect', () => {
  it('redirects eligible CSV and TSV document responses to the Firefox viewer hash URL', () => {
    expect(
      buildFirefoxViewerRedirect(
        response({ url: 'https://example.com/report.csv?download=1' }),
        'moz-extension://abc/viewer.html'
      )
    ).toEqual({
      redirectUrl: 'moz-extension://abc/viewer.html#https://example.com/report.csv?download=1'
    });

    expect(
      buildFirefoxViewerRedirect(
        response({
          responseHeaders: [{ name: 'Content-Type', value: 'text/tab-separated-values' }]
        }),
        'moz-extension://abc/viewer.html'
      )
    ).toEqual({
      redirectUrl: 'moz-extension://abc/viewer.html#https://example.com/data.txt'
    });
  });

  it('does not redirect attachments, non-GET requests, or non-main-frame responses', () => {
    const viewerUrl = 'moz-extension://abc/viewer.html';

    expect(
      buildFirefoxViewerRedirect(
        response({
          url: 'https://example.com/report.csv',
          responseHeaders: [{ name: 'Content-Disposition', value: 'attachment; filename=report.csv' }]
        }),
        viewerUrl
      )
    ).toBeUndefined();
    expect(
      buildFirefoxViewerRedirect(response({ url: 'https://example.com/report.csv', method: 'POST' }), viewerUrl)
    ).toBeUndefined();
    expect(
      buildFirefoxViewerRedirect(response({ url: 'https://example.com/report.csv', type: 'sub_frame' }), viewerUrl)
    ).toBeUndefined();
  });
});
