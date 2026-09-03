import type { BrowserContext } from '@playwright/test';

export async function loginContext(context: BrowserContext, cookie: string): Promise<void> {
  await context.addCookies([
    {
      name: 'FINANCEOS_SESSION',
      value: cookie,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}
