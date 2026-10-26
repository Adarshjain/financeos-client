import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

import shared from './tailwind.shared';

// Dinero (design system) theme. Loaded only by the (ds) root layout via src/app/(ds)/ds.css,
// Storybook and the check-ui tool. Legacy theme names (background, foreground, border, shadcn
// colors, font-sans/mono, 2xs, lg/md/sm radius) are not here: see tailwind.legacy.config.ts.
const config: Config = {
  presets: [shared as Config],
  content: [
    './src/components/ds/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/organisms/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/(ds)/**/*.{js,ts,jsx,tsx,mdx}',
    './.storybook/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Dinero's one layout switch (owner, 2026-10-19): 640px and below is the phone layout. Legacy keeps `lg`.
      screens: { desk: '641px' },
      colors: {
        // Design system utility colors (var(--ds-*))
        brand: 'var(--ds-brand)',
        'brand-strong': 'var(--ds-brand-strong)',
        'brand-tint': 'var(--ds-brand-tint)',
        'brand-border': 'var(--ds-brand-border)',
        'on-brand': 'var(--ds-on-brand)',
        'focus-ring': 'var(--ds-focus-ring)',
        'brand-hover': 'var(--ds-brand-hover)',
        'brand-pressed': 'var(--ds-brand-pressed)',
        'danger-hover': 'var(--ds-danger-hover)',
        'danger-pressed': 'var(--ds-danger-pressed)',
        positive: 'var(--ds-positive)',
        'positive-strong': 'var(--ds-positive-strong)',
        'positive-tint': 'var(--ds-positive-tint)',
        danger: 'var(--ds-danger)',
        'danger-tint': 'var(--ds-danger-tint)',
        'danger-border': 'var(--ds-danger-border)',
        'danger-ink': 'var(--ds-danger-ink)',
        warning: 'var(--ds-warning)',
        'warning-tint': 'var(--ds-warning-tint)',
        'warning-border': 'var(--ds-warning-border)',
        'warning-ink': 'var(--ds-warning-ink)',
        highlight: 'var(--ds-highlight)',
        'highlight-soft': 'var(--ds-highlight-soft)',
        attention: 'var(--ds-attention)',
        'attention-tint': 'var(--ds-attention-tint)',
        info: 'var(--ds-info)',
        'info-tint': 'var(--ds-info-tint)',
        'info-ink': 'var(--ds-info-ink)',
        'neutral-ink': 'var(--ds-neutral-ink)',
        'accent-mint': 'var(--ds-accent-mint)',
        'accent-gold': 'var(--ds-accent-gold)',
        'accent-gold-strong': 'var(--ds-accent-gold-strong)',
        backdrop: 'var(--ds-backdrop)',
        'series-1': 'var(--ds-chart-1)',
        'series-2': 'var(--ds-chart-2)',
        'series-3': 'var(--ds-chart-3)',
        'series-4': 'var(--ds-chart-4)',
        'series-5': 'var(--ds-chart-5)',
        'series-rest': 'var(--ds-chart-rest)',
        'line-heavy': 'var(--ds-line-heavy)',
        'line-soft': 'var(--ds-line-soft)',
        'line-strong': 'var(--ds-line-strong)',
        line: 'var(--ds-line)',
      },
      backgroundColor: {
        canvas: 'var(--ds-bg-canvas)',
        surface: 'var(--ds-bg-surface)',
        glass: 'var(--ds-bg-glass)',
        sunken: 'var(--ds-bg-sunken)',
        subtle: 'var(--ds-bg-subtle)',
        hover: 'var(--ds-bg-hover)',
        pressed: 'var(--ds-bg-pressed)',
        // Count bubbles on buttons and filter chips are an ink fill (reference.css .cnt).
        ink: 'var(--ds-ink)',
      },
      textColor: {
        ink: 'var(--ds-ink)',
        'ink-2': 'var(--ds-ink-2)',
        'ink-3': 'var(--ds-ink-3)',
        'ink-4': 'var(--ds-ink-4)',
        'ink-faint': 'var(--ds-ink-faint)',
      },
      borderColor: {
        line: 'var(--ds-line)',
        'line-soft': 'var(--ds-line-soft)',
        'line-strong': 'var(--ds-line-strong)',
        'line-heavy': 'var(--ds-line-heavy)',
      },
      fontFamily: {
        text: ['var(--ds-font-text)', 'system-ui', 'sans-serif'],
        display: ['var(--ds-font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--ds-font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'hero-figure': [
          '30px',
          { lineHeight: '34px', fontWeight: '800', letterSpacing: '-0.02em' },
        ],
        'page-title': [
          '24px',
          { lineHeight: '30px', fontWeight: '800', letterSpacing: '-0.015em' },
        ],
        'screen-title': [
          '20px',
          { lineHeight: '26px', fontWeight: '700', letterSpacing: '-0.01em' },
        ],
        figure: [
          '22px',
          { lineHeight: '28px', fontWeight: '800', letterSpacing: '-0.02em' },
        ],
        title: [
          '17px',
          { lineHeight: '22px', fontWeight: '800', letterSpacing: '-0.01em' },
        ],
        heading: ['14px', { lineHeight: '20px', fontWeight: '800' }],
        body: ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'body-strong': ['13px', { lineHeight: '18px', fontWeight: '700' }],
        label: ['12px', { lineHeight: '16px', fontWeight: '600' }],
        caption: ['11px', { lineHeight: '14px', fontWeight: '500' }],
        overline: [
          '10px',
          { lineHeight: '12px', fontWeight: '800', letterSpacing: '0.08em' },
        ],
        micro: ['10px', { lineHeight: '12px', fontWeight: '700' }],
      },
      spacing: {
        'space-2': 'var(--ds-space-2)',
        'space-4': 'var(--ds-space-4)',
        'space-6': 'var(--ds-space-6)',
        'space-8': 'var(--ds-space-8)',
        'space-10': 'var(--ds-space-10)',
        'space-12': 'var(--ds-space-12)',
        'space-14': 'var(--ds-space-14)',
        'space-16': 'var(--ds-space-16)',
        'space-20': 'var(--ds-space-20)',
        'space-24': 'var(--ds-space-24)',
        'space-28': 'var(--ds-space-28)',
        'space-32': 'var(--ds-space-32)',
        'space-40': 'var(--ds-space-40)',
        'space-48': 'var(--ds-space-48)',
        'space-56': 'var(--ds-space-56)',
        'space-64': 'var(--ds-space-64)',
        'space-96': 'var(--ds-space-96)',
        // Bottom offset for floating bars, and the clearance content keeps under a floating bar.
        'safe-12': 'calc(var(--ds-space-12) + env(safe-area-inset-bottom))',
        'safe-24': 'calc(var(--ds-space-24) + env(safe-area-inset-bottom))',
        // Device safe-area insets (notch, home bar, landscape); 0 on desktop. --ds-safe-top zeroes the top one
        // under something that already took it (the new-version banner).
        'safe-top': 'var(--ds-safe-top, env(safe-area-inset-top))',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
        'safe-56': 'calc(var(--ds-space-56) + var(--ds-safe-top, env(safe-area-inset-top)))',
        // Where in-page sticky content stops: just under the sticky top bar. The page content sets --ds-sticky-top; elsewhere (dialogs) it is 0.
        'sticky-offset': 'var(--ds-sticky-top, 0px)',
        'bottom-clearance': 'calc(var(--ds-space-64) + var(--ds-space-24) + env(safe-area-inset-bottom))',
      },
      maxHeight: {
        // Full dynamic viewport minus the notch / status-bar inset (a phone sheet never reaches under it).
        'dvh-safe': 'calc(100dvh - env(safe-area-inset-top))',
      },
      borderRadius: {
        'ds-2xs': 'var(--ds-radius-2xs)',
        'ds-xs': 'var(--ds-radius-xs)',
        'ds-sm': 'var(--ds-radius-sm)',
        'ds-md': 'var(--ds-radius-md)',
        'ds-lg': 'var(--ds-radius-lg)',
        'ds-xl': 'var(--ds-radius-xl)',
        'ds-2xl': 'var(--ds-radius-2xl)',
        'ds-pill': 'var(--ds-radius-pill)',
      },
      ringColor: {
        surface: 'var(--ds-bg-surface)',
      },
      // Frosted glass (bg-glass + backdrop-blur-glass + backdrop-saturate-glass), behind the `glass:` variant.
      backdropBlur: { glass: 'var(--ds-blur-glass)' },
      backdropSaturate: { glass: 'var(--ds-saturate-glass)' },
      boxShadow: {
        'level-1': 'var(--ds-shadow-level-1)',
        'level-2': 'var(--ds-shadow-level-2)',
        'level-3': 'var(--ds-shadow-level-3)',
        'up-1': 'var(--ds-shadow-up-1)',
        'up-2': 'var(--ds-shadow-up-2)',
      },
      size: {
        'icon-xs': 'var(--ds-icon-xs)',
        'icon-sm': 'var(--ds-icon-sm)',
        'icon-md': 'var(--ds-icon-md)',
        'icon-lg': 'var(--ds-icon-lg)',
        'icon-inline': 'var(--ds-icon-inline)',
      },
      height: {
        'icon-xs': 'var(--ds-icon-xs)',
        'icon-sm': 'var(--ds-icon-sm)',
        'icon-md': 'var(--ds-icon-md)',
        'icon-lg': 'var(--ds-icon-lg)',
        'icon-inline': 'var(--ds-icon-inline)',
        'control-sm': 'var(--ds-control-sm)',
        'control-md': 'var(--ds-control-md)',
        'control-lg': 'var(--ds-control-lg)',
        'control-xl': 'var(--ds-control-xl)',
      },
      minHeight: {
        'control-sm': 'var(--ds-control-sm)',
        'control-md': 'var(--ds-control-md)',
        'control-lg': 'var(--ds-control-lg)',
        'control-xl': 'var(--ds-control-xl)',
      },
      // Square controls (icon buttons, pager pills, steppers) need the size tokens as widths too.
      width: {
        'icon-xs': 'var(--ds-icon-xs)',
        'icon-sm': 'var(--ds-icon-sm)',
        'icon-md': 'var(--ds-icon-md)',
        'icon-lg': 'var(--ds-icon-lg)',
        'icon-inline': 'var(--ds-icon-inline)',
        'control-sm': 'var(--ds-control-sm)',
        'control-md': 'var(--ds-control-md)',
        'control-lg': 'var(--ds-control-lg)',
        'control-xl': 'var(--ds-control-xl)',
        'container-xs': 'var(--ds-container-xs)',
        // Popover/menu content sized to its trigger (CSS vars set by Radix).
        'popover-trigger': 'var(--radix-popover-trigger-width)',
        'menu-trigger': 'var(--radix-dropdown-menu-trigger-width)',
      },
      maxWidth: {
        'container-sm': 'var(--ds-container-sm)',
        'container-md': 'var(--ds-container-md)',
        'container-lg': 'var(--ds-container-lg)',
        'container-xl': 'var(--ds-container-xl)',
        'container-viewport-inset': 'var(--ds-container-viewport-inset)',
      },
      minWidth: {
        // Capped at the phone inset so a full-width trigger never pushes a popover past the equal side gutters.
        'popover-trigger': 'min(var(--radix-popover-trigger-width), var(--ds-container-viewport-inset))',
        'menu-trigger': 'var(--radix-dropdown-menu-trigger-width)',
        'control-sm': 'var(--ds-control-sm)',
        'control-md': 'var(--ds-control-md)',
        'control-lg': 'var(--ds-control-lg)',
        'control-xl': 'var(--ds-control-xl)',
        'container-xs': 'var(--ds-container-xs)',
      },
      // The one non-16:9 frame: the holding price chart on desktop (owner, 2026-10-23). Generic, so any wide frame can use it.
      aspectRatio: { wide: '21 / 9' },
      zIndex: {
        sticky: 'var(--ds-z-sticky)',
        floating: 'var(--ds-z-floating)',
        backdrop: 'var(--ds-z-backdrop)',
        overlay: 'var(--ds-z-overlay)',
      },
      // Radix state attributes as named variants (data-open:, data-highlighted:…) so
      // components never need arbitrary data-[state=…] selectors (RULES §3.1).
      data: {
        open: 'state="open"',
        closed: 'state="closed"',
        checked: 'state="checked"',
        unchecked: 'state="unchecked"',
        indeterminate: 'state="indeterminate"',
        active: 'state="active"',
        inactive: 'state="inactive"',
        on: 'state="on"',
        highlighted: 'highlighted',
        disabled: 'disabled',
        'side-top': 'side="top"',
        'side-bottom': 'side="bottom"',
        'side-left': 'side="left"',
        'side-right': 'side="right"',
      },
      transitionDuration: {
        fast: 'var(--ds-dur-fast)',
        base: 'var(--ds-dur-base)',
        slow: 'var(--ds-dur-slow)',
        loop: 'var(--ds-dur-loop)',
      },
      keyframes: {
        sweep: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(250%)' },
        },
        'highlight-sweep': {
          from: { backgroundSize: '0% 62%' },
        },
      },
      animation: {
        sweep: 'sweep var(--ds-dur-loop) cubic-bezier(.2,.8,.2,1) infinite',
        'highlight-sweep': 'highlight-sweep var(--ds-dur-emphasis) cubic-bezier(.2,.7,.2,1) both',
      },
    },
  },
  plugins: [
    // `with-selection-bar:` is true while a SelectionBar is mounted anywhere in the document (the phone tab bar hides under it).
    plugin(({ addVariant }) => {
      addVariant('glass', '@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))');
      addVariant('with-selection-bar', ':is(body:has([data-selection-bar]) &)');
    }),
    // Search-match marker stroke (Highlight): gradient, size, rough ends and tilt can't be token classes.
    plugin(({ addUtilities }) => {
      addUtilities({
        '.highlight-stroke': {
          'background-image':
            'linear-gradient(100deg, var(--ds-highlight) 0%, var(--ds-highlight-soft) 55%, var(--ds-highlight) 100%)',
          'background-repeat': 'no-repeat',
          'background-position': '0 85%',
          'background-size': '100% 62%',
          'border-radius': '.9em .3em .8em .25em/.35em .6em .3em .6em',
          display: 'inline-block',
          transform: 'rotate(-1.2deg)',
          'box-decoration-break': 'clone',
          'background-color': 'transparent',
          color: 'inherit',
        },
      });
    }),
  ],
};

export default config;
