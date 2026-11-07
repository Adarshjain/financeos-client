import { cookies } from 'next/headers';

import { parseTabSlot, TAB_SLOT_COOKIE, type TabSlot } from './tabSlotName';

/** Server side: the second tab of this device's phone bottom bar, so the first paint is already right. */
export async function readTabSlot(): Promise<TabSlot> {
  return parseTabSlot((await cookies()).get(TAB_SLOT_COOKIE)?.value);
}
