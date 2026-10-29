import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { createSerwistRoute } from '@serwist/turbopack';

/**
 * Versions the precached `/offline` document so a new deploy replaces it
 * instead of serving the previous build's copy. Vercel builds from a git
 * checkout; the random fallback only kicks in when git is unavailable.
 */
const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ||
  crypto.randomUUID();

/**
 * Precache only the JS/CSS chunks the `/offline` document itself loads (read from its prerendered HTML).
 * Every other chunk (Legacy, other pages) is runtime-cached CacheFirst by sw.ts on first use. If the HTML is
 * not readable at build time, nothing is filtered and every chunk is precached as before.
 */
type ManifestEntry = { url: string; size: number; integrity?: string; revision?: string | null };

function offlineChunkFilter() {
  let html: string;
  try {
    html = readFileSync(path.join(process.cwd(), '.next/server/app/offline.html'), 'utf-8');
  } catch {
    return undefined;
  }
  const needed = new Set([...html.matchAll(/static\/[^"'\\\s?]+\.(?:js|css)/g)].map((m) => m[0]));
  if (needed.size === 0) return undefined;
  return async (entries: ManifestEntry[]) => ({
    manifest: entries.filter((e) => {
      const i = e.url.indexOf('static/');
      if (i < 0 || !/\.(?:js|css)$/.test(e.url)) return true;
      const rest = e.url.slice(i);
      // Build-id manifests (_buildManifest.js etc.) and the turbopack runtime are tiny; keep them.
      return needed.has(rest) || /static\/[^/]+\/_[A-Za-z]+\.js$/.test(rest) || rest.includes('/turbopack-');
    }),
    warnings: [],
  });
}
const chunkFilter = offlineChunkFilter();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: '/offline', revision }],
    // The plugin precaches every file under public/ by default. The static
    // system reference (public/handbook, ~1.2 MB of docs) is read on demand by
    // maintainers, not by app users, so keep it out of every install. The same
    // goes for the Storybook build that Vercel deploys under public/storybook.
    // Also kept out: iOS splash screens and the 512px icons (only the browser's install flow fetches those),
    // and the unreferenced logo.
    globIgnores: [
      '**/node_modules/**/*',
      'public/handbook/**/*',
      'public/storybook/**/*',
      'public/splash/**/*',
      'public/images/**/*',
      'public/icons/icon-512.png',
      'public/icons/maskable-512.png',
    ],
    ...(chunkFilter ? { manifestTransforms: [chunkFilter] } : {}),
    swSrc: 'src/app/sw.ts',
    useNativeEsbuild: true,
  });
