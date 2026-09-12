import { FormEvent, useState } from 'react';
import { PRODUCT_NAME } from '../shared/constants';

export function Popup() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function openViewer(path: string) {
    const viewerUrl = chrome.runtime.getURL(path);
    void chrome.tabs.create({ url: viewerUrl });
  }

  function openLocalFile() {
    openViewer('viewer.html?mode=local');
  }

  function openUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      setError('Enter a valid URL.');
      return;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      setError('Only http and https URLs are supported.');
      return;
    }

    openViewer(`viewer.html?url=${encodeURIComponent(parsed.toString())}`);
  }

  return (
    <main className="popup">
      <h1>{PRODUCT_NAME}</h1>
      <button type="button" onClick={openLocalFile}>
        Open local file
      </button>
      <form onSubmit={openUrl}>
        <label htmlFor="url">URL</label>
        <input
          id="url"
          type="url"
          value={url}
          placeholder="https://example.com/data.csv"
          onChange={(event) => setUrl(event.currentTarget.value)}
        />
        {error ? <p className="error">{error}</p> : null}
        <button type="submit">Open URL</button>
      </form>
    </main>
  );
}
