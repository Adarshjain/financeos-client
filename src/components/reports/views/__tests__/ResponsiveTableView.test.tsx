import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TableData } from '@/lib/reports.types';
import { formatMoney } from '@/lib/utils';
import { stubPhone } from '@/test/stubPhone';

import { ResponsiveTableView } from '../ResponsiveTableView';

const data: TableData = {
  type: 'TABLE',
  mode: 'raw',
  columns: [
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'side', label: 'Side', type: 'enum', valueLabels: { asset: 'Asset' } },
    { key: 'value', label: 'Value', type: 'number', format: 'currency' },
  ],
  rows: [{ id: '1', name: 'Savings', side: 'asset', value: 100 }],
  page: { number: 0, size: 25, totalElements: 1, totalPages: 1 },
};

afterEach(() => vi.unstubAllGlobals());

describe('ResponsiveTableView', () => {
  it('renders a table on desktop, hiding the group column and putting the group total in the value column', () => {
    stubPhone(false);
    render(<ResponsiveTableView data={data} groupField="side" groupTotals={{ asset: 100 }} valueKey="value" hideRowCount />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Value']);
    const groupRow = screen.getAllByRole('row')[1];
    expect(within(groupRow).getAllByRole('cell').map((c) => c.textContent)).toEqual(['Asset', formatMoney(100)]);
    expect(screen.queryByText('1 row')).not.toBeInTheDocument();
  });

  it('renders a table where matchMedia is missing (server render, tests)', () => {
    render(<ResponsiveTableView data={data} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders cards below the sm breakpoint', () => {
    stubPhone(true);
    render(<ResponsiveTableView data={data} groupField="side" groupTotals={{ asset: 100 }} valueKey="value" />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const asset = screen.getByRole('region', { name: 'Asset' });
    expect(within(asset).getByRole('listitem')).toHaveTextContent('Savings');
  });
});
