import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

import { E2E_CLIENT_URL } from './fixtures/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: '.',
  outputDir: 'test-results',
  fullyParallel: true,
  workers: 4,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: E2E_CLIENT_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  globalSetup: path.resolve(__dirname, './global-setup.ts'),
  globalTeardown: path.resolve(__dirname, './global-teardown.ts'),
  projects: [
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.ts/,
    },
    {
      name: 'ui-desktop',
      testMatch: /ui\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'ui-mobile',
      testMatch: /ui\/.*\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
      },
      grep: /@mobile/,
    },
  ],
});
