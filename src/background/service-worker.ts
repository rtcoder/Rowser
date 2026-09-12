import { detectDocument } from './detect-document';
import { saveNavigationHandoff } from './handoff-store';

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (!details.tabId || details.tabId < 0 || !details.url.startsWith('http')) {
      return undefined;
    }

    const detection = detectDocument({
      url: details.url,
      method: details.method,
      type: details.type,
      responseHeaders: details.responseHeaders ?? []
    });

    if (!detection.shouldOpen) {
      return undefined;
    }

    const token = crypto.randomUUID();
    void saveNavigationHandoff(token, {
      sourceUrl: details.url,
      detectedFormat: detection.format,
      mimeType: detection.mimeType,
      contentLength: detection.contentLength,
      fileName: detection.fileName,
      createdAt: Date.now()
    }).then(() => {
      void chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL(`viewer.html?token=${encodeURIComponent(token)}`)
      });
    });

    return undefined;
  },
  {
    urls: ['http://*/*', 'https://*/*'],
    types: ['main_frame']
  },
  ['responseHeaders']
);
