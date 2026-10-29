import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);

import { formatMoney } from '@/lib/format';
import type { TableData } from '@/lib/reports.types';
import { stubPhone } from '@/test/stubPhone';

import { UnderlyingGroupTables, type UnderlyingGroupTablesProps } from '../UnderlyingGroupTables';

const table: TableData = {
  type: 'TABLE',
  mode: 'raw',
  columns: [
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'side', label: 'Side', type: 'enum', valueLabels: { asset: 'Asset', liability: 'Liability' } },
    { key: 'kind', label: 'Kind', type: 'enum', valueLabels: { bank_account: 'Bank account', broker: 'Broker', credit_card: 'Credit card' } },
    { key: 'value', label: 'Value', type: 'number', format: 'currency' },
  ],
  rows: [
    { id: 'a1', name: 'Savings', side: 'asset', kind: 'bank_account', value: 10000 },
    { id: 'a2', name: 'Broker', side: 'asset', kind: 'broker', value: 6000 },
    { id: 'l1', name: 'Card', side: 'liability', kind: 'credit_card', value: 500 },
  ],
  page: { number: 0, size: 25, totalElements: 3, totalPages: 1 },
};
const totals = { asset: 16000, liability: -500 };
const twoPages = { number: 0, size: 2, totalElements: 3, totalPages: 2 };

function renderTables(over: Partial<UnderlyingGroupTablesProps> = {}) {
  const onSortChange = vi.fn();
  const onPageChange = vi.fn();
  const onRowClick = vi.fn();
  render(
    <UnderlyingGroupTables
      table={table}
      groupField="side"
      groupTotals={totals}
      valueKey="value"
      subtitleKey="kind"
      sort={null}
      onSortChange={onSortChange}
      onPageChange={onPageChange}
      onRowClick={onRowClick}
      {...over}
    />,
  );
  return { onSortChange, onPageChange, onRowClick };
}

const region = (name: string) => screen.getByRole('region', { name });
const bodyRows = (scope: HTMLElement) => within(scope).getAllByRole('row').slice(1);
const cellText = (row: HTMLElement) => within(row).getAllByRole('cell').map((c) => c.textContent);

afterEach(() => vi.unstubAllGlobals());

describe('UnderlyingGroupTables (desktop)', () => {
  it('draws one table per group in the totals\' order, each headed by its total, without the group column', () => {
    renderTables();
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Asset', 'Liability']);
    const asset = region('Asset');
    expect(within(asset).getByRole('heading', { level: 3 })).toHaveTextContent('Asset');
    expect(within(asset).getByText(formatMoney(16000, { decimals: 'auto' }))).toHaveClass('tabular-nums');
    expect(within(asset).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Value']);
    expect(bodyRows(asset).map(cellText)).toEqual([
      ['Savings Bank account', formatMoney(10000, { decimals: 'auto' })],
      ['Broker Broker', formatMoney(6000, { decimals: 'auto' })],
    ]);
    const liability = region('Liability');
    expect(within(liability).getByText(formatMoney(-500, { decimals: 'auto' }))).toBeInTheDocument();
    expect(bodyRows(liability).map(cellText)).toEqual([['Card Credit card', formatMoney(500, { decimals: 'auto' })]]);
    expect(screen.queryByRole('columnheader', { name: 'Side' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Kind' })).not.toBeInTheDocument();
  });

  it('prints the kind as a muted label beside the name', () => {
    renderTables();
    const savings = screen.getByRole('button', { name: 'Savings Bank account' });
    expect(within(savings).getByText('Bank account')).toHaveClass('text-slate-500');
  });

  it('keeps the tables split while sorted; every table marks the shared sort and any header drives it', () => {
    const { onSortChange } = renderTables({ sort: { key: 'value', direction: 'asc' } });
    expect(within(region('Asset')).getByRole('columnheader', { name: 'Value' })).toHaveAttribute('aria-sort', 'ascending');
    expect(within(region('Liability')).getByRole('columnheader', { name: 'Value' })).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(within(region('Liability')).getByRole('button', { name: 'Value' }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'value', direction: 'desc' });
  });

  it('orders the groups as the totals do whatever the page order', () => {
    renderTables({ table: { ...table, rows: [table.rows[2], table.rows[1], table.rows[0]] } });
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Asset', 'Liability']);
    expect(bodyRows(region('Asset')).map((r) => cellText(r)[0])).toEqual(['Broker Broker', 'Savings Bank account']);
  });

  it('opens a row', () => {
    const { onRowClick } = renderTables();
    fireEvent.click(screen.getByRole('button', { name: 'Card Credit card' }));
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1' }));
  });

  it('leaves rows inert without a row action', () => {
    renderTables({ onRowClick: undefined });
    expect(screen.queryByRole('button', { name: /Savings/ })).not.toBeInTheDocument();
    expect(screen.getByText('Savings').closest('tr')).not.toHaveAttribute('role', 'button');
  });

  it('draws one pager under the tables when there is more than one page', () => {
    const { onPageChange } = renderTables({ table: { ...table, page: twoPages } });
    expect(screen.getAllByRole('navigation', { name: 'Pagination' })).toHaveLength(1);
    expect(screen.queryByText(/rows/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('draws no pager for a single page', () => {
    renderTables();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  it('heads a group plainly, in order of first appearance, when the response carries no totals', () => {
    renderTables({ groupTotals: {}, table: { ...table, rows: [table.rows[2], table.rows[0]] } });
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Liability', 'Asset']);
    expect(screen.queryByText(formatMoney(16000, { decimals: 'auto' }))).not.toBeInTheDocument();
    expect(screen.queryByText(formatMoney(-500, { decimals: 'auto' }))).not.toBeInTheDocument();
  });

  it('shows the name column plainly when the datasource folds nothing into it', () => {
    renderTables({ subtitleKey: null });
    expect(within(region('Asset')).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Kind', 'Value']);
  });
});

describe('UnderlyingGroupTables (phone)', () => {
  beforeEach(() => stubPhone(true));

  it('lists each group\'s rows as cards under its heading, with one Sort bar over all of them', () => {
    renderTables();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getAllByRole('combobox', { name: 'Sort' })).toHaveLength(1);
    // Neither the side (the section) nor the kind (beside the name) is a sort option.
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Default order', 'Name', 'Value']);
    const asset = region('Asset');
    expect(within(asset).getByText(formatMoney(16000, { decimals: 'auto' }))).toBeInTheDocument();
    const savings = within(asset).getByRole('button', { name: /Savings/ });
    expect(within(savings).getByText('Bank account')).toHaveClass('text-slate-500');
    expect(within(savings).getByText(formatMoney(10000, { decimals: 'auto' }))).toHaveClass('font-semibold');
    expect(within(region('Liability')).getByRole('button', { name: /Card/ })).toBeInTheDocument();
  });

  it('sorts from the Sort bar', () => {
    const { onSortChange } = renderTables();
    fireEvent.click(screen.getByRole('option', { name: 'Value' }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'value', direction: 'asc' });
  });

  it('draws one pager under the cards when there is more than one page', () => {
    renderTables({ table: { ...table, page: twoPages } });
    expect(screen.getAllByRole('navigation', { name: 'Pagination' })).toHaveLength(1);
  });
});
