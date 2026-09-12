export type DetectedFormat = 'csv' | 'tsv' | 'unknown';

export interface ResponseMetadata {
  url: string;
  method: string;
  type: string;
  responseHeaders: Array<{ name?: string; value?: string }>;
}

export interface DetectionResult {
  shouldOpen: boolean;
  format: DetectedFormat;
  mimeType: string | null;
  contentLength: number | null;
  fileName: string | null;
}

const SUPPORTED_MIME_TYPES = new Map<string, DetectedFormat>([
  ['text/csv', 'csv'],
  ['application/csv', 'csv'],
  ['text/tab-separated-values', 'tsv'],
  ['text/tsv', 'tsv']
]);

const EMPTY_RESULT: DetectionResult = {
  shouldOpen: false,
  format: 'unknown',
  mimeType: null,
  contentLength: null,
  fileName: null
};

export function detectDocument(input: ResponseMetadata): DetectionResult {
  const headers = normalizeHeaders(input.responseHeaders);
  const contentType = headers.get('content-type') ?? null;
  const mimeType = contentType?.split(';', 1)[0]?.trim().toLowerCase() ?? null;
  const contentDisposition = headers.get('content-disposition') ?? '';
  const contentLength = parseContentLength(headers.get('content-length') ?? null);
  const fileName = parseFileName(contentDisposition);

  if (input.method.toUpperCase() !== 'GET' || input.type !== 'main_frame') {
    return { ...EMPTY_RESULT, mimeType: contentType, contentLength, fileName };
  }

  if (/\battachment\b/i.test(contentDisposition)) {
    return { ...EMPTY_RESULT, mimeType: contentType, contentLength, fileName };
  }

  const extensionFormat = detectFormatByUrl(input.url);
  const mimeFormat = mimeType ? SUPPORTED_MIME_TYPES.get(mimeType) ?? 'unknown' : 'unknown';
  const format = extensionFormat !== 'unknown' ? extensionFormat : mimeFormat;

  return {
    shouldOpen: format !== 'unknown',
    format,
    mimeType: contentType,
    contentLength,
    fileName
  };
}

function normalizeHeaders(headers: ResponseMetadata['responseHeaders']): Map<string, string> {
  const normalized = new Map<string, string>();

  for (const header of headers) {
    if (!header.name || header.value == null) {
      continue;
    }

    normalized.set(header.name.toLowerCase(), header.value);
  }

  return normalized;
}

function detectFormatByUrl(rawUrl: string): DetectedFormat {
  try {
    const { pathname } = new URL(rawUrl);
    const lowerPath = pathname.toLowerCase();

    if (lowerPath.endsWith('.csv')) {
      return 'csv';
    }

    if (lowerPath.endsWith('.tsv')) {
      return 'tsv';
    }
  } catch {
    return 'unknown';
  }

  return 'unknown';
}

function parseContentLength(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseFileName(contentDisposition: string): string | null {
  const quoted = /filename="([^"]+)"/i.exec(contentDisposition);
  if (quoted) {
    return quoted[1];
  }

  const unquoted = /filename=([^;]+)/i.exec(contentDisposition);
  return unquoted?.[1]?.trim() ?? null;
}
