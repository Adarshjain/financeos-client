import { spawnSync } from 'node:child_process';

import { createSerwistRoute } from '@serwist/turbopack';

/**
 * Versions the precached `/offline` document so a new deploy replaces it
 * instead of serving the previous build's copy. Vercel builds from a git
 * checkout; the random fallback only kicks in when git is unavailable.
 */
const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: '/offline', revision }],
    swSrc: 'src/app/sw.ts',
    useNativeEsbuild: true,
  });
