import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CorporateActionItem } from '@/lib/investments.types';

import { loadCorporateActionsPage } from './holdingActions';
import { CorporateActionsCard } from './HoldingCards';
import type { CorporateActionRowModel, HoldingSection } from './holdingModel';

vi.mock('./holdingActions', () => ({ loadCorporateActionsPage: vi.fn(), loadDividendsPage: vi.fn(), loadTradesPage: vi.fn() }));

const item = (id: string): CorporateActionItem => ({
  id,
  instrumentId: 'i1',
  instrumentName: 'Test Ltd',
  instrumentSymbol: 'TST',
  type: 'split',
  ratioFrom: 1,
  ratioTo: 2,
  exDate: '2025-06-10',
  notes: null,
  targetInstrumentId: null,
  targetInstrumentName: null,
  targetInstrumentSymbol: null,
  costAllocationPct: null,
  fractionalCashInLieu: null,
  createdAt: '2025-06-01',
  quantityBefore: null,
  quantityAfter: null,
  costPerUnitBefore: null,
  costPerUnitAfter: null,
});

const section = (rows: CorporateActionRowModel[]): HoldingSection<CorporateActionRowModel> => ({
  rows,
  position: { page: 0, size: 5, totalElements: rows.length, totalPages: rows.length ? 1 : 0 },
});

describe('CorporateActionsCard', () => {
  it('a row click hands that row\'s saved action to onEdit', async () => {
    const onEdit = vi.fn();
    const a = item('a1');
    const b = item('a2');
    render(
      <CorporateActionsCard
        instrumentId="i1"
        initial={section([
          { id: 'a1', title: 'Split 1:2', subtitle: 'ex 10 Jun 25', item: a },
          { id: 'a2', title: 'Split 1:3', subtitle: 'ex 11 Jun 25', item: b },
        ])}
        onRecord={vi.fn()}
        onEdit={onEdit}
      />
    );
    await userEvent.click(screen.getByText('Split 1:3'));
    expect(onEdit).toHaveBeenCalledWith(b);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('Record still calls onRecord', async () => {
    const onRecord = vi.fn();
    const onEdit = vi.fn();
    render(<CorporateActionsCard instrumentId="i1" initial={section([])} onRecord={onRecord} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Record' }));
    expect(onRecord).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('the empty state has no clickable rows', () => {
    render(<CorporateActionsCard instrumentId="i1" initial={section([])} onRecord={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText('No corporate actions yet')).toBeInTheDocument();
    expect(screen.queryAllByRole('button').map((b) => b.textContent)).toEqual(['Record']);
  });

  it('a changed reloadKey reloads the page shown; the first render does not', async () => {
    const load = vi.mocked(loadCorporateActionsPage);
    load.mockReset();
    const two = (id: string, title: string): HoldingSection<CorporateActionRowModel> => ({
      rows: [{ id, title, subtitle: '', item: item(id) }],
      position: { page: 1, size: 1, totalElements: 3, totalPages: 3 },
    });
    load.mockResolvedValueOnce({ success: true, data: two('a2', 'Split 1:3') } as never).mockResolvedValueOnce({ success: true, data: two('a2', 'Split 1:4') } as never);
    const first = { ...section([{ id: 'a1', title: 'Split 1:2', subtitle: '', item: item('a1') }]), position: { page: 0, size: 1, totalElements: 3, totalPages: 3 } };
    const ui = (key: number) => <CorporateActionsCard instrumentId="i1" initial={first} onRecord={vi.fn()} onEdit={vi.fn()} reloadKey={key} />;
    const view = render(ui(0));
    expect(load).not.toHaveBeenCalled();
    const next = screen.getAllByRole('button', { name: /next/i });
    await userEvent.click(next[next.length - 1]);
    expect(await screen.findByText('Split 1:3')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
    view.rerender(ui(1));
    expect(await screen.findByText('Split 1:4')).toBeInTheDocument();
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(load).toHaveBeenLastCalledWith('i1', 1);
  });
});
