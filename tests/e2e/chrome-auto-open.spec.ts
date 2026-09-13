import { chromium, expect, test } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('redirects a top-level CSV navigation to the packaged Chrome viewer', async () => {
  const fixtureServer = await startFixtureServer();
  const browser = await launchExtension();

  try {
    const rules = await getDynamicRules(browser.context);
    expect(rules).toHaveLength(4);

    const page = await browser.context.newPage();
    await page.goto(fixtureServer.url('/file.csv'));

    await expect(page).toHaveURL(/chrome-extension:\/\/[^/]+\/viewer\.html#/);
    await expect(page.getByRole('region', { name: 'CSV table' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Ada' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Linus' })).toBeVisible();
    expect(fixtureServer.requestCount('/file.csv')).toBeGreaterThanOrEqual(2);
  } finally {
    await browser.close();
    await fixtureServer.close();
  }
});

test('switches Table to Raw and back without refetching the source', async () => {
  const fixtureServer = await startFixtureServer();
  const browser = await launchExtension();

  try {
    await getDynamicRules(browser.context);
    const page = await browser.context.newPage();
    await page.goto(fixtureServer.url('/file.csv'));

    await expect(page.getByRole('region', { name: 'CSV table' })).toBeVisible();
    expect(fixtureServer.requestCount('/file.csv')).toBe(2);

    await page.getByLabel('Viewer mode').getByRole('button', { name: 'Raw' }).click();
    await expect(page.locator('pre.raw')).toContainText('name,score');
    expect(fixtureServer.requestCount('/file.csv')).toBe(2);

    await page.getByLabel('Viewer mode').getByRole('button', { name: 'Table' }).click();
    await expect(page.getByRole('region', { name: 'CSV table' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Ada' })).toBeVisible();
    expect(fixtureServer.requestCount('/file.csv')).toBe(2);
  } finally {
    await browser.close();
    await fixtureServer.close();
  }
});

test('opens a manual URL in the packaged Chrome viewer', async () => {
  const fixtureServer = await startFixtureServer();
  const browser = await launchExtension();

  try {
    const viewerUrl = await extensionUrl(browser.context, 'viewer.html');
    const page = await browser.context.newPage();
    await page.goto(`${viewerUrl}?url=${encodeURIComponent(fixtureServer.url('/manual.csv'))}`);

    await expect(page.getByRole('region', { name: 'CSV table' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Manual' })).toBeVisible();
    await expect(page.getByText('manual.csv')).toBeVisible();
    expect(fixtureServer.requestCount('/manual.csv')).toBe(1);
  } finally {
    await browser.close();
    await fixtureServer.close();
  }
});

test('recovers from a manual URL load error by opening another file', async () => {
  const fixtureServer = await startFixtureServer();
  const browser = await launchExtension();

  try {
    const page = await openManualUrl(browser.context, fixtureServer.url('/missing.csv'));

    await expect(page.getByRole('heading', { name: 'HTTP 404' })).toBeVisible();
    await expect(page.getByText('HTTP 404: Not Found')).toBeVisible();

    await page.getByRole('button', { name: 'Open another file' }).click();

    await expect(page.getByText('Open a CSV or TSV URL from the popup, or drop a file here.')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
  } finally {
    await browser.close();
    await fixtureServer.close();
  }
});

test('imports quoted CSV values without splitting embedded commas or quotes', async () => {
  const fixtureServer = await startFixtureServer();
  const browser = await launchExtension();

  try {
    const page = await openManualUrl(browser.context, fixtureServer.url('/quoted.csv'));

    await expect(page.getByRole('region', { name: 'CSV table' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Hello, world' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'A "quoted" value' })).toBeVisible();
    await expect(page.getByText('1-2 of 2')).toBeVisible();
  } finally {
    await browser.close();
    await fixtureServer.close();
  }
});

test('imports multiline CSV cells as a single row value', async () => {
  const fixtureServer = await startFixtureServer();
  const browser = await launchExtension();

  try {
    const page = await openManualUrl(browser.context, fixtureServer.url('/multiline.csv'));

    await expect(page.getByRole('region', { name: 'CSV table' })).toBeVisible();
    await expect(page.getByRole('cell', { name: /line one\s+line two/ })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'single line' })).toBeVisible();
    await expect(page.getByText('1-2 of 2')).toBeVisible();
  } finally {
    await browser.close();
    await fixtureServer.close();
  }
});

test('imports mixed-type CSV columns without dropping text values', async () => {
  const fixtureServer = await startFixtureServer();
  const browser = await launchExtension();

  try {
    const page = await openManualUrl(browser.context, fixtureServer.url('/mixed-types.csv'));

    await expect(page.getByRole('region', { name: 'CSV table' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '100' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'text' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '300' })).toBeVisible();
    await expect(page.getByText('1-3 of 3')).toBeVisible();
  } finally {
    await browser.close();
    await fixtureServer.close();
  }
});

test('redirects a top-level TSV navigation to the packaged Chrome viewer', async () => {
  const fixtureServer = await startFixtureServer();
  const browser = await launchExtension();

  try {
    await getDynamicRules(browser.context);
    const page = await browser.context.newPage();
    await page.goto(fixtureServer.url('/file.tsv'));

    await expect(page).toHaveURL(/chrome-extension:\/\/[^/]+\/viewer\.html#/);
    await expect(page.getByRole('region', { name: 'CSV table' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Ada' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Linus' })).toBeVisible();
    expect(fixtureServer.requestCount('/file.tsv')).toBeGreaterThanOrEqual(2);
  } finally {
    await browser.close();
    await fixtureServer.close();
  }
});

test('redirects a MIME-only CSV navigation to the packaged Chrome viewer', async () => {
  const fixtureServer = await startFixtureServer();
  const browser = await launchExtension();

  try {
    await getDynamicRules(browser.context);
    const page = await browser.context.newPage();
    await page.goto(fixtureServer.url('/mime-only'));

    await expect(page).toHaveURL(/chrome-extension:\/\/[^/]+\/viewer\.html#/);
    await expect(page.getByRole('region', { name: 'CSV table' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Grace' })).toBeVisible();
    expect(fixtureServer.requestCount('/mime-only')).toBeGreaterThanOrEqual(2);
  } finally {
    await browser.close();
    await fixtureServer.close();
  }
});

test('does not redirect attachment CSV navigations', async () => {
  const fixtureServer = await startFixtureServer();
  const browser = await launchExtension();

  try {
    await getDynamicRules(browser.context);
    const page = await browser.context.newPage();
    const targetUrl = fixtureServer.url('/attachment.csv');
    await page.goto(fixtureServer.url('/attachment.csv')).catch((error: unknown) => {
      if (!(error instanceof Error) || !error.message.includes('Download is starting')) {
        throw error;
      }
    });

    await expect(page).not.toHaveURL(/chrome-extension:\/\/[^/]+\/viewer\.html#/);
    expect(page.url() === 'about:blank' || page.url() === targetUrl).toBe(true);
    expect(fixtureServer.requestCount('/attachment.csv')).toBe(1);
  } finally {
    await browser.close();
    await fixtureServer.close();
  }
});

interface FixtureServer {
  url: (pathname: string) => string;
  requestCount: (pathname: string) => number;
  close: () => Promise<void>;
}

async function startFixtureServer(): Promise<FixtureServer> {
  const requests = new Map<string, number>();

  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    requests.set(pathname, (requests.get(pathname) ?? 0) + 1);

    if (pathname === '/file.csv') {
      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/csv'
      });
      response.end('name,score\nAda,10\nLinus,7\n');
      return;
    }

    if (pathname === '/file.tsv') {
      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/tab-separated-values'
      });
      response.end('name\tscore\nAda\t10\nLinus\t7\n');
      return;
    }

    if (pathname === '/mime-only') {
      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/csv'
      });
      response.end('name,score\nGrace,9\n');
      return;
    }

    if (pathname === '/manual.csv') {
      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/csv'
      });
      response.end('name,score\nManual,42\n');
      return;
    }

    if (pathname === '/quoted.csv') {
      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/csv'
      });
      response.end('id,title,note\n1,"Hello, world","A ""quoted"" value"\n2,"Second","plain"\n');
      return;
    }

    if (pathname === '/multiline.csv') {
      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/csv'
      });
      response.end('id,note\n1,"line one\nline two"\n2,"single line"\n');
      return;
    }

    if (pathname === '/mixed-types.csv') {
      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/csv'
      });
      response.end('id,value\n1,100\n2,text\n3,300\n');
      return;
    }

    if (pathname === '/attachment.csv') {
      response.writeHead(200, {
        'Content-Disposition': 'attachment; filename="attachment.csv"',
        'Content-Type': 'text/csv'
      });
      response.end('name,score\nDownload,1\n');
      return;
    }

    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('not found');
  });

  await listen(server);
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Fixture server did not bind to a TCP port.');
  }

  return {
    url: (pathname: string) => `http://127.0.0.1:${address.port}${pathname}`,
    requestCount: (pathname: string) => requests.get(pathname) ?? 0,
    close: () => close(server)
  };
}

function listen(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

interface LaunchedExtension {
  context: BrowserContext;
  close: () => Promise<void>;
}

async function launchExtension(): Promise<LaunchedExtension> {
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'rowser-chrome-'));
  const extensionPath = path.resolve('dist/chrome');

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  return {
    context,
    close: async () => {
      await context.close();
      await rm(userDataDir, { recursive: true, force: true });
    }
  };
}

async function getDynamicRules(
  context: BrowserContext
): Promise<chrome.declarativeNetRequest.Rule[]> {
  const serviceWorker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker', { timeout: 5_000 }).catch(() => null));
  if (!serviceWorker) {
    throw new Error(
      `Extension service worker did not start. workers=${context
        .serviceWorkers()
        .map((worker) => worker.url())
        .join(',')} pages=${context
        .pages()
        .map((openPage) => openPage.url())
        .join(',')}`
    );
  }

  return serviceWorker.evaluate(() => chrome.declarativeNetRequest.getDynamicRules());
}

async function extensionUrl(context: BrowserContext, pathInExtension: string): Promise<string> {
  const serviceWorker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker', { timeout: 5_000 }));
  return serviceWorker.evaluate((pathName) => chrome.runtime.getURL(pathName), pathInExtension);
}

async function openManualUrl(context: BrowserContext, sourceUrl: string) {
  const viewerUrl = await extensionUrl(context, 'viewer.html');
  const page = await context.newPage();
  await page.goto(`${viewerUrl}?url=${encodeURIComponent(sourceUrl)}`);
  return page;
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
