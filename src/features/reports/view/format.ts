/** Table page sizes; a plain module so the server page can read the default (a 'use client' export is a reference there). */
export const PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 50;

/** "+₹6,100" / "-₹6,100": a change with its sign always shown. */
export function signed(text: string, value: number): string {
  return value > 0 ? `+${text}` : text;
}
