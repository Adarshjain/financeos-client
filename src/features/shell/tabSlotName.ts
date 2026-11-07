/** The device's choice for the phone bottom bar's second tab: a plain cookie, so the server reads it before the first paint. */
export const TAB_SLOT_COOKIE = 'FINANCEOS_TAB_SLOT';

export const TAB_SLOTS = ['accounts', 'lending', 'investments', 'upcoming'] as const;
export type TabSlot = (typeof TAB_SLOTS)[number];
export const DEFAULT_TAB_SLOT: TabSlot = 'accounts';

/** The slot a cookie value names; anything unknown or missing is Accounts. */
export function parseTabSlot(value: string | null | undefined): TabSlot {
  return (TAB_SLOTS as readonly string[]).includes(value ?? '') ? (value as TabSlot) : DEFAULT_TAB_SLOT;
}
