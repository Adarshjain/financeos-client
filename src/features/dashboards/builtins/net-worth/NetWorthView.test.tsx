import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { kpi, rawTable, widget } from '@/features/dashboards/builtins/testFixtures';
import type { KpiData, ReportData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { NetWorthView } from './NetWorthView';

const view = (data: ReportData, onKpiValueClick?: () => void) => ({
  widget: widget('net_worth'),
  data,
  onPageChange: vi.fn(),
  onKpiValueClick,
});

const comparison = (over: Partial<NonNullable<KpiData['comparison']>> = {}): KpiData['comparison'] => ({
  previousValue: 1157622,
  previousDateRange: { from: '2026-09-01', to: '2026-09-30' },
  change: 41220,
  changePercent: 3.6,
  direction: 'up',
  sentiment: 'good',
  ...over,
});

describe('NetWorthView', () => {
  it('the figure in whole rupees with Indian grouping', () => {
    renderWithQuery(<NetWorthView {...view(kpi(1198842))} />);
    expect(screen.getByTestId('net-worth-value')).toHaveTextContent('₹11,98,842');
    expect(screen.queryByTestId('net-worth-delta')).not.toBeInTheDocument();
  });

  it('the change against the compared period, signed with its percent', () => {
    renderWithQuery(<NetWorthView {...view(kpi(1198842, comparison()))} />);
    const delta = screen.getByTestId('net-worth-delta');
    expect(delta).toHaveTextContent('+₹41,220 (+3.6%)');
    expect(delta).toHaveTextContent('vs Sep');
  });

  it('a fall reads as bad: negative sign, no plus', () => {
    renderWithQuery(<NetWorthView {...view(kpi(1000000, comparison({ change: -20000, changePercent: -2, direction: 'down', sentiment: 'bad' })))} />);
    expect(screen.getByTestId('net-worth-delta')).toHaveTextContent('−₹20,000 (−2%)');
  });

  it('the figure opens the underlying data when the frame offers it, and is plain text otherwise', async () => {
    const onClick = vi.fn();
    const { unmount } = renderWithQuery(<NetWorthView {...view(kpi(500), onClick)} />);
    await userEvent.setup().click(screen.getByRole('button', { name: '₹500' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    unmount();
    renderWithQuery(<NetWorthView {...view(kpi(500))} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('data of another shape is not drawn', () => {
    renderWithQuery(<NetWorthView {...view(rawTable(['a'], []))} />);
    expect(screen.getByText("This widget can't show this data.")).toBeInTheDocument();
  });
});
