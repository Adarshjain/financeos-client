import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

// Shared by the Legacy and Dinero Tailwind configs: dark-mode strategy, hover guard and the
// plugins/variants both UIs use. Theme and content live in tailwind.legacy.config.ts and
// tailwind.ds.config.ts so each root layout ships only its own CSS.
const shared: Partial<Config> = {
  darkMode: ['class'],
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [
    require('tailwindcss-animate'),
    plugin(({ addBase, addUtilities, addVariant }) => {
      addBase({
        html: {
          '-webkit-tap-highlight-color': 'transparent',
        },
      });
      addUtilities({
        '.scrollbar-none': {
          'scrollbar-width': 'none',
        },
        '.scrollbar-none::-webkit-scrollbar': {
          display: 'none',
        },
        '.touch-callout-none': {
          '-webkit-touch-callout': 'none',
        },
        '.grid-cols-template': {
          'grid-template-columns': 'var(--grid-template)',
        },
        '.grid-cols-fill-auto': {
          'grid-template-columns': 'minmax(0, 1fr) auto',
        },
        '.grid-cols-fill-auto-auto': {
          'grid-template-columns': 'minmax(0, 1fr) auto auto',
        },
        '.grid-cols-lead-fill-auto': {
          'grid-template-columns': 'auto minmax(0, 1fr) auto',
        },
        '.grid-cols-lead-fill-auto-auto': {
          'grid-template-columns': 'auto minmax(0, 1fr) auto auto',
        },
      });
      addVariant(
        'active-self',
        '&:active:not(:has(button:active, a:active, [role="button"]:active))'
      );
    }),
  ],
};

export default shared;
