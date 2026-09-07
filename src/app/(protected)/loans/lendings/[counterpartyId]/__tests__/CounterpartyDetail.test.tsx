import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { LendingResponse } from '@/lib/types';

vi.mock('../components/useCounterpartyDetail', () => ({
  useCounterpartyDetail: vi.fn(),
}));

vi.mock('../components/LendingMatchPanel', () => ({
  LendingMatchPanel: () => <div data-testid="match-panel" />,
}));

import { useCounterpartyDetail } from '../components/useCounterpartyDetail';
import { CounterpartyDetail } from '../CounterpartyDetail';

type LendingEntry = LendingResponse & { runningBalance: number };

function makeEntry(overrides: Partial<LendingEntry> = {}): LendingEntry {
  return {
    id: 'l1',
    counterpartyId: 'cp1',
    counterpartyName: 'Rahul',
    amount: 500,
    direction: 'lent',
    entryDate: '2026-01-01',
    createdAt: '2026-01-01T00:00:00Z',
    runningBalance: 500,
    ...overrides,
  };
}

function baseHookReturn(entries: LendingEntry[]) {
  return {
    cp: {
      id: 'cp1',
      name: 'Rahul',
      notes: null,
      netPosition: 0,
      totalLent: 500,
      totalBorrowed: 0,
      entryCount: entries.length,
    },
    entriesWithRunningBalance: entries,
    editCpOpen: false,
    setEditCpOpen: vi.fn(),
    cpName: 'Rahul',
    setCpName: vi.fn(),
    cpNotes: '',
    setCpNotes: vi.fn(),
    submittingCp: false,
    addEntryOpen: false,
    setAddEntryOpen: vi.fn(),
    addDir: 'lent',
    setAddDir: vi.fn(),
    addAmount: '',
    setAddAmount: vi.fn(),
    addEntryDate: '',
    setAddEntryDate: vi.fn(),
    addExpDate: '',
    setAddExpDate: vi.fn(),
    addNotes: '',
    setAddNotes: vi.fn(),
    addSelectedTx: null,
    onSelectAddTx: vi.fn(),
    onClearAddTx: vi.fn(),
    submittingAddEntry: false,
    editLendingOpen: false,
    setEditLendingOpen: vi.fn(),
    lendingDir: 'lent',
    setLendingDir: vi.fn(),
    lendingAmount: '',
    setLendingAmount: vi.fn(),
    lendingDate: '',
    setLendingDate: vi.fn(),
    lendingExpDate: '',
    setLendingExpDate: vi.fn(),
    lendingNotes: '',
    setLendingNotes: vi.fn(),
    editSelectedTx: null,
    onSelectEditTx: vi.fn(),
    onClearEditTx: vi.fn(),
    submittingEditLending: false,
    handleUpdateCp: vi.fn(),
    handleDeleteCp: vi.fn(),
    handleAddEntry: vi.fn(),
    handleDeleteLending: vi.fn(),
    handleOpenEditLending: vi.fn(),
    handleUpdateLending: vi.fn(),
  };
}

describe('CounterpartyDetail', () => {
  it('does not mount the match panel when every loaded entry already has a transaction', () => {
    vi.mocked(useCounterpartyDetail).mockReturnValue(
      baseHookReturn([
        makeEntry({ transaction: { id: 'tx-1', accountId: 'acc1', date: '2026-01-01', signedAmount: -500 } }),
      ]) as never,
    );

    render(<CounterpartyDetail counterpartyId="cp1" />);

    expect(screen.queryByTestId('match-panel')).not.toBeInTheDocument();
  });

  it('mounts the match panel when at least one loaded entry has no transaction', () => {
    vi.mocked(useCounterpartyDetail).mockReturnValue(
      baseHookReturn([
        makeEntry({ id: 'l1', transaction: { id: 'tx-1', accountId: 'acc1', date: '2026-01-01', signedAmount: -500 } }),
        makeEntry({ id: 'l2' }),
      ]) as never,
    );

    render(<CounterpartyDetail counterpartyId="cp1" />);

    expect(screen.getByTestId('match-panel')).toBeInTheDocument();
  });
});
