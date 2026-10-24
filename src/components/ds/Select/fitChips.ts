/**
 * How many chips fit on one line of the given width, the rest being summarised by a "+n" badge.
 * When every chip fits there is no badge. Otherwise the badge must fit too, so chips are dropped until it does.
 * A width of 0 or less means "not measured yet": every chip shows.
 */
export function fitChips(
  widths: number[],
  overflowWidth: number,
  available: number,
  gap: number,
): number {
  if (available <= 0) return widths.length;
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, widths.length - 1);
  if (total <= available) return widths.length;
  let used = overflowWidth;
  let count = 0;
  for (const w of widths) {
    if (used + gap + w > available) break;
    used += gap + w;
    count += 1;
  }
  return count;
}
