// Runs before `next build` (npm prebuild). On Vercel it builds Storybook into
// public/storybook so the design system can be reviewed on any device at
// /storybook (behind the normal login). Local and CI builds skip it.
import { spawnSync } from 'node:child_process';

if (!process.env.VERCEL) {
  console.log('storybook: skipped (not a Vercel build)');
  process.exit(0);
}
const r = spawnSync('npx', ['storybook', 'build', '--quiet', '-o', 'public/storybook'], {
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
