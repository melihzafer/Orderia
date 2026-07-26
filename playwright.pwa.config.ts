import { defineConfig, devices } from '@playwright/test';

const port = 8090;

export default defineConfig({
  testDir: './e2e-pwa',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 45_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    serviceWorkers: 'allow',
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run serve:web -- --port ${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: `http://127.0.0.1:${port}`,
  },
  projects: [
    {
      name: 'chromium-pwa',
      use: {
        ...devices['Pixel 7'],
        browserName: 'chromium',
      },
    },
    {
      name: 'iphone-safari',
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
      },
    },
  ],
});
