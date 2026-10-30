import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const size = vi.hoisted(() => ({ width: 800, height: 300 }));
vi.mock('@/lib/charts/useElementSize', () => ({ useElementSize: () => [() => {}, size] }));
vi.mock('@/lib/date-range', async (orig) => ({ ...(await orig<typeof import('@/lib/date-range')>()), todayInAppZone: () => '2026-10-13' }));

import type { ChartData } from '@/lib/reports.types';

import { Chart } from './Chart';

const sum = { field: 'amount', aggregation: 'sum' } as const;
const bar = { chartType: 'bar' as const, categories: ['Jan', 'Feb', 'Mar'], series: [{ name: 'spend', data: [10, 20, 30] }], measure: sum };
const pie = { chartType: 'pie' as const, categories: ['Food', 'Travel'], series: [{ name: 'spend', data: [60, 40] }], measure: sum };
const heat = {
  type: 'CHART',
  chartType: 'heatmap',
  dimension: 'date',
  categories: ['2026-10-09', '2026-10-10'],
  series: [{ name: 'Spend', data: [1250, 300] }],
  measure: { field: 'spend', aggregation: 'sum' },
} as unknown as ChartData;
// A bar or slice's press affordance is its class; one per mark.
const cellClasses = () => Array.from(document.querySelectorAll('path[data-bar], path[data-slice]')).map((c) => c.getAttribute('class') ?? '');
const barEl = (i: number) => document.querySelector(`path[data-bar="${i}"]`)!;
const sliceEl = (i: number) => document.querySelector(`path[data-slice="${i}"]`)!;

describe('Chart canSelectEntry', () => {
  it('leaves every entry pressable when absent', () => {
    const onSelectEntry = vi.fn();
    render(<Chart data={bar} onSelectEntry={onSelectEntry} />);
    expect(cellClasses().every((c) => c!.includes('cursor-pointer'))).toBe(true);
  });

  it('gives a rejected bar no cursor or state, and presses nothing for it', () => {
    const onSelectEntry = vi.fn();
    render(<Chart data={bar} onSelectEntry={onSelectEntry} canSelectEntry={(e) => e.key !== 'Feb'} />);
    expect(cellClasses()).toEqual([expect.stringContaining('cursor-pointer'), '', expect.stringContaining('cursor-pointer')]);
    fireEvent.click(barEl(1));
    expect(onSelectEntry).not.toHaveBeenCalled();
  });

  it('presses an accepted bar', () => {
    const onSelectEntry = vi.fn();
    render(<Chart data={bar} onSelectEntry={onSelectEntry} canSelectEntry={(e) => e.key === 'Feb'} />);
    fireEvent.click(barEl(1));
    expect(onSelectEntry).toHaveBeenCalledWith(expect.objectContaining({ key: 'Feb' }));
  });

  it('turns a rejected slice\'s legend row into plain text and presses nothing for the slice', () => {
    const onSelectEntry = vi.fn();
    render(<Chart data={pie} onSelectEntry={onSelectEntry} canSelectEntry={(e) => e.key === 'Food'} />);
    expect(screen.getAllByRole('button').filter((b) => b.getAttribute('data-testid') === null)).toHaveLength(1);
    expect(cellClasses()).toEqual([expect.stringContaining('cursor-pointer'), '']);
    fireEvent.click(sliceEl(1));
    expect(onSelectEntry).not.toHaveBeenCalled();
    fireEvent.click(sliceEl(0));
    expect(onSelectEntry).toHaveBeenCalledWith(expect.objectContaining({ key: 'Food' }));
  });

  it('draws a rejected heatmap day with no button', () => {
    const onSelectEntry = vi.fn();
    render(<Chart data={heat} onSelectEntry={onSelectEntry} canSelectEntry={(e) => e.key === '2026-10-09'} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelectEntry).toHaveBeenCalledWith(expect.objectContaining({ key: '2026-10-09' }));
  });
});

describe('Chart entry index', () => {
  it('reports the category index with a pressed slice, and keys repeated bar labels apart', () => {
    const onSelectEntry = vi.fn();
    render(<Chart data={{ ...pie, categories: ['Food', 'Travel'] }} onSelectEntry={onSelectEntry} />);
    fireEvent.click(sliceEl(1));
    expect(onSelectEntry).toHaveBeenCalledWith(expect.objectContaining({ key: 'Travel', index: 1 }));
  });

  it('draws one cell per bar even when labels repeat', () => {
    render(<Chart data={{ ...bar, categories: ['Jan', 'Jan', 'Jan'] }} onSelectEntry={vi.fn()} />);
    expect(cellClasses()).toHaveLength(3);
  });
});
