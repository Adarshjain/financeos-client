import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KpiView } from '@/components/reports/views/KpiView';
import type { KpiData } from '@/lib/reports.types';

const kpi: KpiData = {
  type: 'KPI',
  value: 1234,
  measure: 'amount',
  aggregation: 'sum',
  format: 'number',
  comparison: null,
  meta: { rowCount: 1, dateRange: null },
};

describe('KpiView onValueClick', () => {
  it('renders the value as plain text without onValueClick', () => {
    render(<KpiView data={kpi} variant="widget" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it.each([
    ['widget', 'text-3xl'],
    ['default', 'text-lg'],
  ] as const)('renders the %s value as a "View underlying data" button with the same typography', (variant, size) => {
    const onValueClick = vi.fn();
    render(<KpiView data={kpi} variant={variant} onValueClick={onValueClick} />);
    const button = screen.getByRole('button', { name: 'View underlying data' });
    expect(button).toHaveTextContent('1,234');
    expect(button).toHaveClass(size, 'tabular-nums', 'decoration-dotted', 'hover:underline', 'focus-visible:underline');
    fireEvent.click(button);
    expect(onValueClick).toHaveBeenCalledTimes(1);
  });
});
