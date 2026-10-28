import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ReportData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { kpi, rawTable, widget } from '../testFixtures';
import { dueTile, UpcomingView } from './UpcomingView';

const view = (data: ReportData, onPageChange = vi.fn()) => ({ widget: widget('upcoming', { days: 14 }), data, onPageChange });

const COLUMNS = [
  { key: 'dueDate', type: 'date' },
  { key: 'title', type: 'string' },
  { key: 'amount', type: 'number' },
];
const rows = [
  { dueDate: '2026-10-15', title: 'Amex Platinum bill', amount: 33900 },
  { dueDate: '2026-10-23', title: 'Priya Nair', amount: 12000 },
  { dueDate: '2026-10-28', title: 'SBI statement expected', amount: null },
];

describe('dueTile', () => {
  it('splits a due date into the tile\'s day and month; none without a date', () => {
    expect(dueTile({ dueDate: '2026-10-05' })).toEqual({ day: 5, monthLabel: 'OCT' });
    expect(dueTile({ dueDate: null })).toBeNull();
  });
});

describe('UpcomingView', () => {
  it('a row per obligation in the server\'s order: date tile, title and amount', () => {
    renderWithQuery(<UpcomingView {...view(rawTable(COLUMNS, rows))} />);
    const list = screen.getAllByTestId('upcoming-row');
    expect(list).toHaveLength(3);
    expect(list[0]).toHaveTextContent('15');
    expect(list[0]).toHaveTextContent('OCT');
    expect(list[0]).toHaveTextContent('Amex Platinum bill');
    expect(list[0]).toHaveTextContent('₹33,900');
    expect(list[1]).toHaveTextContent('Priya Nair');
  });

  it('rows are tightened around the date tile (smaller gap and vertical padding than a default row)', () => {
    renderWithQuery(<UpcomingView {...view(rawTable(COLUMNS, rows))} />);
    for (const row of screen.getAllByTestId('upcoming-row')) {
      expect(row.className).toMatch(/gap-space-8/);
      expect(row.className).toMatch(/py-space-8/);
      expect(row.className).not.toMatch(/gap-space-12|py-space-10/);
    }
  });

  it('a row without an amount shows none', () => {
    renderWithQuery(<UpcomingView {...view(rawTable(COLUMNS, rows))} />);
    const last = screen.getAllByTestId('upcoming-row')[2];
    expect(last).toHaveTextContent('SBI statement expected');
    expect(within(last).queryByText(/₹/)).not.toBeInTheDocument();
  });

  it('a row without a date shows a dash in the tile\'s place', () => {
    renderWithQuery(<UpcomingView {...view(rawTable(COLUMNS, [{ dueDate: null, title: 'Undated bill', amount: 100 }]))} />);
    expect(screen.getByTestId('upcoming-row')).toHaveTextContent('—');
  });

  it('empty: says there are no rows', () => {
    renderWithQuery(<UpcomingView {...view(rawTable(COLUMNS, []))} />);
    expect(screen.getByText('No rows for this configuration.')).toBeInTheDocument();
  });

  it('pages only when the rows span several pages', async () => {
    const onPage = vi.fn();
    const { unmount } = renderWithQuery(<UpcomingView {...view(rawTable(COLUMNS, rows), onPage)} />);
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    unmount();
    renderWithQuery(<UpcomingView {...view(rawTable(COLUMNS, rows, { totalElements: 60, totalPages: 2 }), onPage)} />);
    await userEvent.setup().click(screen.getByRole('button', { name: /next/i }));
    expect(onPage).toHaveBeenCalledWith(1);
  });

  it('data of another shape is not drawn', () => {
    renderWithQuery(<UpcomingView {...view(kpi(1))} />);
    expect(screen.getByText("This widget can't show this data.")).toBeInTheDocument();
  });
});
