import { RECOMMENDED_MAX_BYTES } from '../../shared/constants';
import { formatHintFromName, sourceNameFromUrl } from './source-name';
import type { RowserSource } from './source-types';

export interface LoadRemoteSourceOptions {
  allowUnknownLengthOverLimit?: boolean;
}

export interface RemoteResponseBlobOptions {
  allowUnknownLengthOverLimit: boolean;
  maxUnknownLengthBytes?: number;
  signal?: AbortSignal;
  sourceName: string;
  sourceUrl: string;
}

export class UnknownLengthLimitExceededError extends Error {
  readonly name = 'UnknownLengthLimitExceededError';

  constructor(
    readonly sourceUrl: string,
    readonly sourceName: string
  ) {
    super(
      "This file is larger than Rowser's recommended 512 MB limit. Table mode may fail because of browser memory limits."
    );
  }
}

export async function loadRemoteSource(
  url: string,
  signal: AbortSignal,
  options: LoadRemoteSourceOptions = {}
): Promise<RowserSource> {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    redirect: 'follow',
    signal
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText || 'Remote source failed'}`);
  }

  const name = sourceNameFromUrl(url);
  const blob = await readRemoteResponseBlob(response, {
    allowUnknownLengthOverLimit: options.allowUnknownLengthOverLimit ?? false,
    signal,
    sourceName: name,
    sourceUrl: url
  });
  if (blob.size === 0) {
    throw new Error('Empty file');
  }

  return {
    kind: 'remote',
    name,
    size: blob.size,
    formatHint: formatHintFromName(name),
    blob,
    originalUrl: url
  };
}

export async function readRemoteResponseBlob(
  response: Response,
  options: RemoteResponseBlobOptions
): Promise<Blob> {
  if (response.headers.has('Content-Length') || !response.body) {
    return response.blob();
  }

  const reader = response.body.getReader();
  const chunks: ArrayBuffer[] = [];
  const maxBytes = options.maxUnknownLengthBytes ?? RECOMMENDED_MAX_BYTES;
  let loadedBytes = 0;

  try {
    while (true) {
      if (options.signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      const result = await reader.read();
      if (result.done) {
        break;
      }

      loadedBytes += result.value.byteLength;
      if (!options.allowUnknownLengthOverLimit && loadedBytes > maxBytes) {
        await reader.cancel();
        throw new UnknownLengthLimitExceededError(options.sourceUrl, options.sourceName);
      }

      const chunk = new Uint8Array(result.value.byteLength);
      chunk.set(result.value);
      chunks.push(chunk.buffer as ArrayBuffer);
    }
  } finally {
    reader.releaseLock();
  }

  return new Blob(chunks, {
    type: response.headers.get('Content-Type') ?? ''
  });
}
