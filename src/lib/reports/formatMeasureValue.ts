import { formatMoney } from '@/lib/format';
import { isMoneyField } from '@/lib/reports.helpers';

const COUNT_FORMAT = new Intl.NumberFormat('en-IN');
const DECIMALS_FORMAT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/**
 * Renders a measure value consistently across the KPI, raw-table and pivot
 * views: counts as plain integers, money as currency, everything else to two
 * decimal places.
 */
export function formatMeasureValue(
  value: number | null | undefined,
  options: {
    field?: string;
    aggregation?: string;
    format?: 'currency' | 'number' | 'percent';
    /** True/false decides whether the value is money; omitted, the format hint or the field's name decides. */
    money?: boolean;
    /** Money in whole rupees (₹1,84,320), for previews; otherwise paise (₹1,84,320.45). */
    wholeRupees?: boolean;
  },
): string {
  if (value === null || value === undefined) return '—';
  if (options.aggregation === 'count') return COUNT_FORMAT.format(value);
  const money = options.money ?? (options.format ? options.format === 'currency' : !!options.field && isMoneyField(options.field));
  if (money) {
    return formatMoney(value, { decimals: options.wholeRupees ? 'whole' : 'exact' });
  }
  if (options.format === 'percent') return DECIMALS_FORMAT.format(value) + '%';
  return DECIMALS_FORMAT.format(value);
}
