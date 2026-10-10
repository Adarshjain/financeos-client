import { vi } from 'vitest';

import { BELOW_SM_QUERY } from '@/lib/useMediaQuery';

/**
 * Makes `window.matchMedia` report a phone (below `sm`) — or not — for the rest of the test.
 * Undo with `vi.unstubAllGlobals()`. Without it jsdom has no matchMedia, which reads as desktop.
 */
export function stubPhone(phone = true): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: phone && query === BELOW_SM_QUERY,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}
