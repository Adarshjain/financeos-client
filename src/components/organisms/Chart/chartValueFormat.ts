// Value text for the Dinero charts: money through the one formatter (whole rupees; compact "k" ticks on
// axes), other numbers as plain quantities with compact ticks from lib/charts.

import { type ValueFormat,valueFormat } from '@/lib/charts/chart-format';
import { formatMoney, formatQuantity } from '@/lib/format';

export function chartValueFormat(money: boolean): ValueFormat {
  if (!money) {
    return { full: (v) => formatQuantity(v, 2), compact: valueFormat(false).compact };
  }
  return {
    full: (v) => formatMoney(v),
    compact: (v) => (Number.isFinite(v) ? formatMoney(v, { compact: 'k' }) : ''),
  };
}
