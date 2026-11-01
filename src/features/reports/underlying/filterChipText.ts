import { formatDateRangeCompressed } from '@/lib/date-range';

const SERVER_DAY = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;
const SERVER_RANGE = /^Between (\d{2}\/\d{2}\/\d{4}) and (\d{2}\/\d{2}\/\d{4})$/;

function isoDay(serverDay: string): string {
  const [dd, mm, yyyy] = serverDay.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * The chip's text as the server sends it ("Between 01/09/2026 and 30/09/2026", "After 13/10/2026", "Last 30 days",
 * "is Picker Bank"), set in sentence case with dates the way the app writes them ("between 1–30 Sep", "after 13 Oct").
 * The chip reads "{field} {text}", so the verb starts lower case; values after it keep their own case.
 */
export function filterChipText(text: string, options?: { today?: string }): string {
  const range = SERVER_RANGE.exec(text);
  if (range) {
    return `between ${formatDateRangeCompressed(isoDay(range[1]), isoDay(range[2]), options)}`;
  }
  const dated = text.replace(SERVER_DAY, (day) => formatDateRangeCompressed(isoDay(day), isoDay(day), options));
  return dated.replace(/^([A-Z])(?=[a-z])/, (first) => first.toLowerCase());
}
