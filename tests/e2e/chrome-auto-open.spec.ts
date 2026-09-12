import { chromium, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('redirects a top-level CSV navigation to the packaged Chrome viewer', async () => {
  const fixtureServer = await startFixtureServer();
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

  try {
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

    const rules = await serviceWorker.evaluate(() => chrome.declarativeNetRequest.getDynamicRules());
    expect(rules).toHaveLength(4);

    const page = await context.newPage();
    await page.goto(fixtureServer.url('/file.csv'));

    await expect(page).toHaveURL(/chrome-extension:\/\/[^/]+\/viewer\.html#/);
    await expect(page.getByRole('region', { name: 'CSV table' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Ada' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Linus' })).toBeVisible();
    expect(fixtureServer.requestCount('/file.csv')).toBeGreaterThanOrEqual(2);
  } finally {
    await context.close();
    await rm(userDataDir, { recursive: true, force: true });
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
