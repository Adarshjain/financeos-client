import { formatCount, formatMoney, formatPercent, formatQuantity } from '@/lib/format';
import { isMoneyField } from '@/lib/reports.helpers';

/**
 * Renders a report measure value for Dinero: counts as plain integers, money as
 * currency, percents to two decimals, everything else to two decimals.
 */
export function formatMeasure(
  value: number | null | undefined,
  options: {
    field?: string;
    aggregation?: string;
    format?: 'currency' | 'number' | 'percent';
    /** True/false decides whether the value is money; omitted, the format hint or the field's name decides. */
    money?: boolean;
    /** Money to the rupee (previews, charts); otherwise paise only when non-zero. */
    wholeRupees?: boolean;
  },
): string {
  if (value === null || value === undefined) return '—';
  if (options.aggregation === 'count') return formatCount(value);
  const money = options.money ?? (options.format ? options.format === 'currency' : !!options.field && isMoneyField(options.field));
  if (money) return formatMoney(value, { decimals: options.wholeRupees ? 'whole' : 'auto' });
  if (options.format === 'percent') return formatPercent(value, { decimals: 2 });
  return formatQuantity(value, 2);
}
