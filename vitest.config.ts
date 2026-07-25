import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The date helpers are timezone-sensitive by nature — that was the root of
    // the calendar-date corruption. Pin a non-UTC, positive-offset zone so a
    // regression fails here instead of only on a contributor's machine.
    // Individual tests override this via `vi.stubEnv` where they need to prove
    // behaviour across zones.
    env: { TZ: 'Asia/Kolkata' },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
