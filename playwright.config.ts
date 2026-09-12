import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    channel: 'chromium',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: './node_modules/.bin/vite --config extension/chrome/vite.config.ts --host 127.0.0.1',
    url: 'http://127.0.0.1:5173/viewer.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
