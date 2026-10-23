/**
 * How a ratio reads. The server stores ratioFrom = held and ratioTo = held after; a bonus is written as
 * new shares for held ("1 : 1" doubles, stored 1 → 2), every other kind as from : to.
 */
export function ratioParts(type: string, from: number, to: number): [number, number] {
  return type === 'bonus' ? [to - from, from] : [from, to];
}

/** "1 : 1" (spaced) or "1:1" (compact). */
export function ratioText(type: string, from: number | null, to: number | null, compact = false): string {
  if (from == null || to == null) return '';
  const [a, b] = ratioParts(type, from, to);
  return compact ? `${a}:${b}` : `${a} : ${b}`;
}
