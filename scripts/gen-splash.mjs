// One-off: writes iOS apple-touch-startup-image PNGs to public/splash/ (light canvas + centred app icon).
// Run: node scripts/gen-splash.mjs   (sizes must match SPLASH in src/app/(ds)/layout.tsx)
import { mkdirSync, readFileSync } from 'node:fs';

import sharp from 'sharp';

const tokens = JSON.parse(readFileSync('design-system/tokens.json', 'utf8'));
const canvas = tokens.color.tokens.find((t) => t.name === 'bg-canvas').value.light;
const SIZES = [
  [430, 932, 3], [428, 926, 3], [414, 896, 3], [414, 896, 2],
  [393, 852, 3], [390, 844, 3], [375, 812, 3], [375, 667, 2],
];

mkdirSync('public/splash', { recursive: true });
for (const [w, h, r] of SIZES) {
  const W = w * r;
  const H = h * r;
  const icon = await sharp('public/icons/icon-512.png').resize(Math.round(W * 0.28)).toBuffer();
  await sharp({ create: { width: W, height: H, channels: 4, background: canvas } })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(`public/splash/splash-${W}x${H}.png`);
}
