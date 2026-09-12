import type { DetectedFormat } from './detect-document';

export interface NavigationHandoff {
  sourceUrl: string;
  detectedFormat: DetectedFormat;
  mimeType: string | null;
  contentLength: number | null;
  fileName: string | null;
  createdAt: number;
}

export const HANDOFF_TTL_MS = 60_000;

export function handoffKey(token: string): string {
  return `navigation:${token}`;
}

export async function saveNavigationHandoff(
  token: string,
  handoff: NavigationHandoff
): Promise<void> {
  await chrome.storage.session.set({ [handoffKey(token)]: handoff });
}

export async function consumeNavigationHandoff(token: string): Promise<NavigationHandoff | null> {
  const key = handoffKey(token);
  const stored = await chrome.storage.session.get(key);
  await chrome.storage.session.remove(key);

  const handoff = stored[key] as NavigationHandoff | undefined;
  if (!handoff || Date.now() - handoff.createdAt > HANDOFF_TTL_MS) {
    return null;
  }

  return handoff;
}
