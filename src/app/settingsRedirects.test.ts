import { describe, expect, it } from 'vitest';

import config from '../../next.config.mjs';

describe('Settings v2 redirects', () => {
  it.each(['/settings/profile', '/settings/appearance', '/settings/app-lock'])('%s permanently goes to /settings', async (source) => {
    const redirects = await config.redirects!();
    expect(redirects).toContainEqual({ source, destination: '/settings', permanent: true });
  });
});
