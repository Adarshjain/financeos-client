import { vi } from 'vitest';

import { DESKTOP_QUERY } from '@/components/ds/phoneLayout';

/**
 * Makes `window.matchMedia` report the design system's desktop layout (at or above `desk`)
 * or its phone layout for the rest of the test. Undo with `vi.unstubAllGlobals()`.
 * Without it jsdom has no matchMedia, which `isPhoneLayout` reads as phone.
 */
export function stubLayout(layout: 'phone' | 'desktop'): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: layout === 'desktop' && query === DESKTOP_QUERY,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}
