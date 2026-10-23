import { cookies } from 'next/headers';

import { HIDE_AMOUNTS_COOKIE } from './hideAmountsName';

/** Server side: whether this device chose to hide amounts, so the first paint is already right. */
export async function readHideAmounts(): Promise<boolean> {
  return (await cookies()).get(HIDE_AMOUNTS_COOKIE)?.value === '1';
}
