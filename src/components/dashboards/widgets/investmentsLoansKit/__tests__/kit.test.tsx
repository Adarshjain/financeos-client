import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Briefcase } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import {
  bookedGainsRequest,
  dayMonth,
  DrillValue,
  fullDate,
  gainTone,
  num,
  positionsValueRequest,
  ProgressBar,
  rupees,
  signedPct,
  signedRupees,
  WidgetEmpty,
  WidgetLoadError,
} from '../kit';

describe('number and date formatting', () => {
  it('num reads numbers and decimal strings, null for anything else', () => {
    expect(num(12.5)).toBe(12.5);
    expect(num('1234.50')).toBe(1234.5);
    expect(num(null)).toBeNull();
    expect(num(undefined)).toBeNull();
    expect(num('')).toBeNull();
    expect(num('abc')).toBeNull();
  });

  it('rupees: whole rupees in Indian grouping, a real minus sign, -0 reads ₹0', () => {
    expect(rupees(1248600)).toBe('₹12,48,600');
    expect(rupees(1248600.6)).toBe('₹12,48,601');
    expect(rupees(-2100)).toBe('−₹2,100');
    expect(rupees(-0.3)).toBe('₹0');
  });

  it('signedRupees / signedPct carry the sign; zero has none', () => {
    expect(signedRupees(8420)).toBe('+₹8,420');
    expect(signedRupees(-2100)).toBe('−₹2,100');
    expect(signedRupees(0.2)).toBe('₹0');
    expect(signedPct(0.68)).toBe('+0.68%');
    expect(signedPct(-2.1)).toBe('−2.10%');
    expect(signedPct(0.001)).toBe('0.00%');
  });

  it('gainTone: emerald gain, rose loss, body colour for zero / unknown', () => {
    expect(gainTone(1)).toContain('emerald');
    expect(gainTone(-1)).toContain('rose');
    expect(gainTone(0)).toContain('slate-900');
    expect(gainTone(null)).toContain('slate-900');
  });

  it('dates read dd/mm/yyyy and dd/mm; absent is empty', () => {
    expect(fullDate('2041-03-05')).toBe('05/03/2041');
    expect(dayMonth('2026-10-08')).toBe('08/10');
    expect(fullDate(null)).toBe('');
    expect(dayMonth(undefined)).toBe('');
  });
});

describe('drill requests', () => {
  it('positions value: open holdings only (the allocation template filter), extra filters appended, no comparison', () => {
    expect(positionsValueRequest()).toEqual({
      type: 'KPI',
      datasource: 'positions',
      definition: {
        measure: 'currentValue',
        aggregation: 'sum',
        filters: [{ field: 'isOpen', operator: 'is', value: true }],
        comparison: { enabled: false },
      },
    });
    const one = positionsValueRequest([{ field: 'assetClass', operator: 'is', value: 'GOLD' }]);
    expect(one.definition.filters).toEqual([
      { field: 'isOpen', operator: 'is', value: true },
      { field: 'assetClass', operator: 'is', value: 'GOLD' },
    ]);
  });

  it('booked gains: realized_lots P&L this FY for the term, equity-oriented only', () => {
    for (const term of ['short', 'long'] as const) {
      expect(bookedGainsRequest(term)).toEqual({
        type: 'KPI',
        datasource: 'realized_lots',
        definition: {
          measure: 'realizedPnl',
          aggregation: 'sum',
          filters: [
            { field: 'sellDate', operator: 'current_fy' },
            { field: 'term', operator: 'is', value: term },
            { field: 'taxClass', operator: 'is', value: 'EQUITY_ORIENTED' },
          ],
        },
      });
    }
  });
});

describe('pieces', () => {
  it('DrillValue is a button named by its figure then what it opens (label in name), and calls back', async () => {
    const onClick = vi.fn();
    render(<DrillValue onClick={onClick} label="view underlying data for X">₹10</DrillValue>);
    const button = screen.getByRole('button', { name: '₹10 — view underlying data for X' });
    expect(button).toHaveAttribute('title', 'View underlying data for X');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('WidgetLoadError shows the server message for an ApiError, a generic one otherwise', () => {
    const apiError = new ApiError(500, { message: 'Prices are stale' } as never);
    const { rerender } = render(<WidgetLoadError what="your loans" error={apiError} />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your loans: Prices are stale");
    rerender(<WidgetLoadError what="your loans" error={new Error('boom')} />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your loans: request failed");
  });

  it('WidgetEmpty shows its title, description and action', () => {
    render(<WidgetEmpty icon={Briefcase} title="Nothing" description="More" action={<a href="/x">Go</a>} />);
    expect(screen.getByText('Nothing')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/x');
  });

  it('ProgressBar clamps to 0–100', () => {
    const { rerender } = render(<ProgressBar pct={140} label="Used" />);
    expect(screen.getByRole('progressbar', { name: 'Used' })).toHaveAttribute('aria-valuenow', '100');
    rerender(<ProgressBar pct={-5} label="Used" />);
    expect(screen.getByRole('progressbar', { name: 'Used' })).toHaveAttribute('aria-valuenow', '0');
  });
});
