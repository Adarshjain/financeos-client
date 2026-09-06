import type { BrowserContext } from '@playwright/test';

import { E2E_CLIENT_URL } from './config';

export async function loginContext(context: BrowserContext, cookie: string): Promise<void> {
  await context.addCookies([
    {
      name: 'FINANCEOS_SESSION',
      value: cookie,
      url: E2E_CLIENT_URL,
    },
  ]);
}
