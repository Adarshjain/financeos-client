import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test as base } from '@playwright/test';

import type { ApiClient } from './api';
import { makeApi } from './api';
import type { CreatedUser } from './auth';
import { createUser } from './auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type User = CreatedUser;
export type Api = ApiClient;

interface TestFixtures {
  routesRecorder: void;
}

interface WorkerFixtures {
  user: User;
  api: Api;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  user: [
    async ({ playwright }, use, workerInfo) => {
      const requestContext = await playwright.request.newContext();
      try {
        const u = await createUser(requestContext, `worker-${workerInfo.workerIndex}`);
        await use(u);
      } finally {
        await requestContext.dispose();
      }
    },
    { scope: 'worker' },
  ],
  api: [
    async ({ user }, use) => {
      const a = makeApi(user.cookie);
      await use(a);
    },
    { scope: 'worker' },
  ],
  routesRecorder: [
    async ({ page }, use, testInfo) => {
      const hasBrowser = Boolean(
        testInfo.project.use.defaultBrowserType || testInfo.project.use.browserName
      );
      if (!hasBrowser) {
        await use();
        return;
      }

      const visitedPaths: string[] = [];
      const recordPath = (rawUrl: string) => {
        try {
          const u = new URL(rawUrl);
          if (u.protocol === 'http:' || u.protocol === 'https:') {
            visitedPaths.push(u.pathname);
          }
        } catch {
          // ignore non-URLs
        }
      };

      if (page.url() && page.url() !== 'about:blank') {
        recordPath(page.url());
      }

      const onFrameNavigated = (frame: import('@playwright/test').Frame) => {
        if (frame === page.mainFrame()) {
          recordPath(frame.url());
        }
      };

      const onRequest = (req: import('@playwright/test').Request) => {
        if (req.isNavigationRequest() && req.frame() === page.mainFrame()) {
          recordPath(req.url());
        }
      };

      page.on('framenavigated', onFrameNavigated);
      page.on('request', onRequest);

      try {
        await use();
      } finally {
        page.off('framenavigated', onFrameNavigated);
        page.off('request', onRequest);
        if (visitedPaths.length > 0) {
          const dir = path.resolve(__dirname, '../test-results/routes-visited');
          fs.mkdirSync(dir, { recursive: true });
          const safeProject = testInfo.project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `${safeProject}-${testInfo.workerIndex}-${process.pid}.jsonl`;
          const filePath = path.join(dir, filename);
          const lines =
            visitedPaths
              .map((pathname) => JSON.stringify({ pathname, timestamp: Date.now() }))
              .join('\n') + '\n';
          fs.appendFileSync(filePath, lines, 'utf8');
        }
      }
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';

/**
 * Creates a fresh, isolated user for tests that require a completely empty state
 * (e.g. asserting that a list starts with 0 items).
 * Call this in `beforeAll` or inside a test.
 */
export async function freshUser(
  request: import('@playwright/test').APIRequestContext,
  label = 'fresh'
): Promise<{ user: User; api: Api }> {
  const user = await createUser(request, label);
  const api = makeApi(user.cookie);
  return { user, api };
}
