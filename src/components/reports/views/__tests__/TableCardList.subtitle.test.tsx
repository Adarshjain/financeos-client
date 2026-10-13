import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);

import type { TableData } from '@/lib/reports.types';
import { formatMoney } from '@/lib/utils';

import { TableCardList } from '../TableCardList';

const data = (over: Partial<TableData> = {}): TableData => ({
  type: 'TABLE',
  mode: 'raw',
  columns: [
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'kind', label: 'Kind', type: 'enum', valueLabels: { bank_account: 'Bank account', broker: 'Broker' } },
    { key: 'side', label: 'Side', type: 'enum', valueLabels: { asset: 'Asset' } },
    { key: 'value', label: 'Value', type: 'number', format: 'currency' },
  ],
  rows: [
    { id: 'a', name: 'Savings', kind: 'bank_account', side: 'asset', value: 100 },
    { id: 'b', name: 'Cash', kind: null, side: 'asset', value: 50 },
  ],
  page: { number: 0, size: 25, totalElements: 2, totalPages: 1 },
  ...over,
});

const cards = () => screen.getAllByRole('listitem');

describe('TableCardList subtitleKey', () => {
  it('prints the subtitle beside the title and leaves it off the meta line', () => {
    render(<TableCardList data={data()} subtitleKey="kind" />);
    const first = cards()[0];
    expect(within(first).getByText('Bank account')).toHaveClass('text-slate-500');
    expect(within(first).getByText('Savings').textContent).toBe('Savings Bank account');
    // The meta line: the side alone.
    expect(within(first).getByText('Asset')).toBeInTheDocument();
    expect(within(first).queryByText(/Bank account · /)).not.toBeInTheDocument();
    expect(within(first).getByText(formatMoney(100))).toHaveClass('font-semibold');
  });

  it('prints nothing beside a title whose row has no subtitle', () => {
    render(<TableCardList data={data()} subtitleKey="kind" />);
    expect(within(cards()[1]).getByText('Cash').textContent).toBe('Cash');
  });

  it('does not offer the subtitle column for sorting', () => {
    render(<TableCardList data={data()} subtitleKey="kind" onSortChange={vi.fn()} />);
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Default order', 'Name', 'Side', 'Value']);
  });

  it('keeps the subtitle on a clickable card', () => {
    const onRowClick = vi.fn();
    render(<TableCardList data={data()} subtitleKey="kind" onRowClick={onRowClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Savings Bank account/ }));
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });
});

describe('TableCardList hidePagination', () => {
  it('draws no pager even for a multi-page list', () => {
    render(
      <TableCardList
        data={data({ page: { number: 0, size: 1, totalElements: 2, totalPages: 2 } })}
        hidePagination
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
    expect(screen.queryByText(/rows/)).not.toBeInTheDocument();
  });
});
