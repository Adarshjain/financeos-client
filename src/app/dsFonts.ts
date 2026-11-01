import localFont from 'next/font/local';

// Design system fonts: Figtree for interface text, Bricolage Grotesque for display.
// Self-hosted variable woff2 covering latin + latin-ext subsets (including ₹ and tabular numbers).
// Shared by the root layout, global-error and global-not-found, which each render their own <html>.
export const figtree = localFont({
  src: './fonts/Figtree-latin-ext.woff2',
  variable: '--ds-font-text',
  display: 'swap',
  weight: '500 800',
});

// Display face trimmed to what the Display type styles use: weights 700–800, opsz pinned at 24,
// latin + ₹ + common punctuation only (anything else falls back to system-ui).
export const bricolageGrotesque = localFont({
  src: './fonts/BricolageGrotesque-display.woff2',
  variable: '--ds-font-display',
  display: 'swap',
  weight: '700 800',
});
