import { PERIOD_PRESETS } from '@/features/transactions/list/transactionsUrl';
import { formatDateRangeCompressed } from '@/lib/date-range';
import { formatMoney } from '@/lib/format/money';

import type { UnderlyingFilterChip } from './underlying.types';

type DayOptions = { today?: string };

/** The chip as the dialog needs it: the server's structured parts are optional, a server that predates them sends only the text. */
export type FilterChipParts = Pick<UnderlyingFilterChip, 'operator' | 'text'> &
  Partial<Pick<UnderlyingFilterChip, 'valueType' | 'valueFormat' | 'datePreset' | 'values'>>;

const SERVER_DAY = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;
const SERVER_RANGE = /^Between (\d{2}\/\d{2}\/\d{4}) and (\d{2}\/\d{2}\/\d{4})$/;

function isoDay(serverDay: string): string {
  const [dd, mm, yyyy] = serverDay.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

const lowerFirst = (s: string) => s.replace(/^([A-Z])(?=[a-z])/, (c) => c.toLowerCase());
const words = (operator: string) => operator.replace(/_/g, ' ');

function presetLabel(preset: string): string | null {
  const found = PERIOD_PRESETS.find((p) => p.id === preset);
  return found ? lowerFirst(found.label) : null;
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

function numberText(chip: FilterChipParts, value: unknown): string {
  const n = Number(value);
  if (chip.valueFormat === 'currency') return formatMoney(n, { decimals: 'auto' });
  if (chip.valueFormat === 'percent') return `${n}%`;
  return n.toLocaleString('en-IN');
}

function dateText(chip: FilterChipParts, values: unknown[], options?: DayOptions): string {
  const day = (v: unknown) => formatDateRangeCompressed(String(v), String(v), options);
  if (chip.datePreset === 'billing_cycles_ago') return `${plural(Number(values[0]), 'billing cycle')} ago`;
  if (chip.datePreset) return presetLabel(chip.datePreset) ?? words(chip.datePreset);
  switch (chip.operator) {
    case 'is':
      return `on ${day(values[0])}`;
    case 'before':
    case 'after':
      return `${chip.operator} ${day(values[0])}`;
    case 'between':
      return `between ${formatDateRangeCompressed(String(values[0]), String(values[1]), options)}`;
    case 'last_x_days':
      return `last ${plural(Number(values[0]), 'day')}`;
    case 'last_x_months':
      return `last ${plural(Number(values[0]), 'month')}`;
    case 'last_x_years':
      return `last ${plural(Number(values[0]), 'year')}`;
    case 'next_x_days':
      return `next ${plural(Number(values[0]), 'day')}`;
    default:
      return words(chip.operator);
  }
}

function textText(chip: FilterChipParts, values: unknown[]): string {
  const list = values.map(String).join(', ');
  return `${chip.operator === 'exact' ? 'is' : words(chip.operator)} ${list}`;
}

/**
 * The chip's right-hand side after its field label ("between 1–30 Sep", "after 13 Oct", "is Picker Bank", "in Food, Fuel",
 * "greater than ₹500"), formatted here from the server's structured parts: sentence case, dates the way the app writes them,
 * amounts as money, relative periods by the app's preset labels. Falls back to reading the server's own text when the parts
 * are missing.
 */
export function filterChipText(chip: FilterChipParts, options?: DayOptions): string {
  const values = chip.values;
  if (!chip.valueType || !values) return legacyChipText(chip.text, options);
  switch (chip.valueType) {
    case 'date':
      return dateText(chip, values, options);
    case 'boolean':
      return `is ${values[0] ? 'Yes' : 'No'}`;
    case 'number': {
      if (chip.operator === 'between') return `between ${numberText(chip, values[0])} and ${numberText(chip, values[1])}`;
      return `${words(chip.operator)} ${numberText(chip, values[0])}`;
    }
    default:
      return textText(chip, values);
  }
}


/**
 * Fallback for a server that sends no parts: the chip's text as the server sends it ("Between 01/09/2026 and 30/09/2026", "After 13/10/2026", "Last 30 days",
 * "is Picker Bank"), set in sentence case with dates the way the app writes them ("between 1–30 Sep", "after 13 Oct").
 * The chip reads "{field} {text}", so the verb starts lower case; values after it keep their own case.
 */
function legacyChipText(text: string, options?: DayOptions): string {
  const range = SERVER_RANGE.exec(text);
  if (range) {
    return `between ${formatDateRangeCompressed(isoDay(range[1]), isoDay(range[2]), options)}`;
  }
  const dated = text.replace(SERVER_DAY, (day) => formatDateRangeCompressed(isoDay(day), isoDay(day), options));
  return lowerFirst(dated);
}
