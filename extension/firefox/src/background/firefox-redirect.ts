import { detectDocument, type ResponseMetadata } from '../../../shared/src/background/detect-document';

export interface FirefoxResponseDetails {
  url: string;
  method: string;
  type: string;
  responseHeaders?: Array<{ name?: string; value?: string }>;
}

interface FirefoxWebRequestApi {
  runtime: {
    getURL(path: string): string;
  };
  webRequest: {
    onHeadersReceived: {
      addListener(
        listener: (details: FirefoxResponseDetails) => { redirectUrl: string } | undefined,
        filter: { urls: string[]; types: string[] },
        extraInfoSpec: string[]
      ): void;
    };
  };
}

declare const browser: FirefoxWebRequestApi;

const FIREFOX_DOCUMENT_FILTER = {
  urls: ['http://*/*', 'https://*/*'],
  types: ['main_frame']
};

export function buildFirefoxViewerRedirect(
  details: FirefoxResponseDetails,
  viewerUrl: string
): { redirectUrl: string } | undefined {
  const result = detectDocument(toResponseMetadata(details));

  if (!result.shouldOpen) {
    return undefined;
  }

  return {
    redirectUrl: `${viewerUrl}#${details.url}`
  };
}

export function installFirefoxDocumentRedirect(api: FirefoxWebRequestApi = browser): void {
  const viewerUrl = api.runtime.getURL('viewer.html');

  api.webRequest.onHeadersReceived.addListener(
    (details) => buildFirefoxViewerRedirect(details, viewerUrl),
    FIREFOX_DOCUMENT_FILTER,
    ['blocking', 'responseHeaders']
  );
}

function toResponseMetadata(details: FirefoxResponseDetails): ResponseMetadata {
  return {
    url: details.url,
    method: details.method,
    type: details.type,
    responseHeaders: details.responseHeaders ?? []
  };
}
