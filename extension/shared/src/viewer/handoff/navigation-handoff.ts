export interface NavigationHandoff {
  sourceUrl: string;
  detectedFormat: 'csv' | 'tsv' | 'unknown';
  mimeType: string | null;
  contentLength: number | null;
  fileName: string | null;
  createdAt: number;
}

const HANDOFF_TTL_MS = 60_000;

export async function consumeNavigationHandoff(token: string): Promise<NavigationHandoff | null> {
  const key = `navigation:${token}`;
  const stored = await chrome.storage.session.get(key);
  await chrome.storage.session.remove(key);

  const handoff = stored[key] as NavigationHandoff | undefined;
  if (!handoff || Date.now() - handoff.createdAt > HANDOFF_TTL_MS) {
    return null;
  }

  return handoff;
}
