import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

import { E2E_CLIENT_URL } from './fixtures/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The nightly run splits the suite across parallel jobs (see .github/workflows/e2e.yml) and gives chat
// its own job: a project's dependencies always run in full (file filters and shards do not narrow
// them), so the ui-chat -> api dependency would drag the whole api project along.
//   E2E_CHAT=exclude  everything except chat (api/chat.spec.ts and the ui-chat projects)
//   E2E_CHAT=only     only chat: api/chat.spec.ts, then the chat UI journeys
const chatMode = process.env.E2E_CHAT;
const isChatProject = (name: string) => name.startsWith('ui-chat');

export default defineConfig({
  testDir: '.',
  outputDir: 'test-results',
  fullyParallel: true,
  workers: 4,
  // One retry on CI hides flakes behind a green run, so the nightly schedule sets E2E_RETRIES=0 and
  // fails on the first flake (see .github/workflows/e2e.yml). Locally there are no retries.
  retries: process.env.E2E_RETRIES ? Number(process.env.E2E_RETRIES) : process.env.CI ? 1 : 0,
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
  projects: ([
    {
      name: 'api',
      testMatch: chatMode === 'only' ? /api\/chat\.spec\.ts/ : /api\/.*\.spec\.ts/,
      ...(chatMode === 'exclude' ? { testIgnore: /api\/chat\.spec\.ts/ } : {}),
    },
    {
      name: 'ui-desktop',
      testMatch: /ui\/.*\.spec\.ts/,
      testIgnore: /ui\/chat\.spec\.ts/,
      // @mobile-only tests exercise phone-only UI (bottom bar, menu sheet, card lists); ui-mobile runs them.
      grepInvert: /@mobile-only/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'ui-mobile',
      testMatch: /ui\/.*\.spec\.ts/,
      testIgnore: /ui\/chat\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
      },
      grep: /@mobile/,
    },
    // Chat holds a JVM-wide 2-permit semaphore per in-flight answer. The api project's concurrency and
    // wall-clock tests deliberately saturate it, so the chat UI journeys run only after the whole api
    // project has finished, one at a time.
    {
      name: 'ui-chat',
      testMatch: /ui\/chat\.spec\.ts/,
      dependencies: ['api'],
      fullyParallel: false,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'ui-chat-mobile',
      testMatch: /ui\/chat\.spec\.ts/,
      dependencies: ['api'],
      fullyParallel: false,
      use: {
        ...devices['Pixel 7'],
      },
      grep: /@mobile/,
    },
  ]).filter((project) => {
    if (chatMode === 'exclude') return !isChatProject(project.name);
    if (chatMode === 'only') return project.name === 'api' || isChatProject(project.name);
    return true;
  }),
});
