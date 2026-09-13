export interface SourceErrorView {
  title: string;
  detail: string;
}

export function classifySourceError(error: unknown): SourceErrorView {
  const detail = error instanceof Error ? error.message : String(error);

  if (detail === 'Empty file') {
    return { title: 'Empty file', detail };
  }

  if (detail === 'Unsupported local extension') {
    return { title: 'Unsupported local extension', detail };
  }

  if (detail === 'Expired automatic-navigation token') {
    return { title: 'Expired automatic-navigation token', detail };
  }

  const httpStatus = detail.match(/^HTTP (\d{3})\b/);
  if (httpStatus) {
    const status = Number(httpStatus[1]);

    if (status >= 500) {
      return { title: 'HTTP 5xx', detail };
    }

    return { title: `HTTP ${status}`, detail };
  }

  return { title: 'Network request failed', detail };
}
