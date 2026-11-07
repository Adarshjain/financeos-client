import { TAB_SLOT_COOKIE, type TabSlot } from './tabSlotName';

/** Client side: remembers this device's choice of the phone bar's second tab for a year. */
export function saveTabSlot(slot: TabSlot): void {
  try {
    document.cookie = `${TAB_SLOT_COOKIE}=${slot}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${
      window.location.protocol === 'https:' ? '; secure' : ''
    }`;
  } catch {
    // Cookies blocked: the choice does not stick.
  }
}
