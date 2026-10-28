import { cookies } from 'next/headers';

import { RAIL_COLLAPSED_COOKIE } from './railCollapsedName';

/** Server side: whether this device collapsed the desktop rail, so the first paint is already right. */
export async function readRailCollapsed(): Promise<boolean> {
  return (await cookies()).get(RAIL_COLLAPSED_COOKIE)?.value === '1';
}
