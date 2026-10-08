import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LendingResponse } from '@/lib/types';

vi.mock('../components/useCounterpartyDetail', () => ({
  useCounterpartyDetail: vi.fn(),
}));

// The real PageActionBar only registers its children with a layout slot;
// render them inline so the action buttons are reachable here.
vi.mock('@/components/layout/PageActionBarContext', () => ({
  PageActionBar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="action-bar">{children}</div>
  ),
}));

vi.mock('../components/LendingMatchPanel', () => ({
  LendingMatchPanel: () => <div data-testid="match-panel" />,
}));

import { useCounterpartyDetail } from '../components/useCounterpartyDetail';
import { CounterpartyDetail } from '../CounterpartyDetail';

// The export dialog remembers "Your name" per device; start every test clean.
beforeEach(() => {
  window.localStorage.clear();
});

type LendingEntry = LendingResponse & { runningBalance: number };

function makeEntry(overrides: Partial<LendingEntry> = {}): LendingEntry {
  return {
    id: 'l1',
    counterpartyId: 'cp1',
    counterpartyName: 'Rahul',
    amount: 500,
    direction: 'lent',
    kind: 'principal',
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
      repaidToYou: 0,
      repaidByYou: 0,
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
    addEntryType: 'lent',
    setAddEntryType: vi.fn(),
    openSettleUp: vi.fn(),
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
    lendingEntryType: 'lent',
    setLendingEntryType: vi.fn(),
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

describe('CounterpartyDetail Settle up', () => {
  it('offers Settle up while there is a balance and hands the balance to the hook', () => {
    const hook = baseHookReturn([makeEntry()]);
    hook.cp.netPosition = 2500;
    vi.mocked(useCounterpartyDetail).mockReturnValue(hook as never);

    render(<CounterpartyDetail counterpartyId="cp1" />);

    // The actions now render twice (desktop card + mobile bar); either copy works.
    fireEvent.click(screen.getAllByRole('button', { name: /Settle up/ })[0]);
    expect(hook.openSettleUp).toHaveBeenCalledWith(2500);
  });

  it('also offers Settle up when you are the one who owes', () => {
    const hook = baseHookReturn([makeEntry()]);
    hook.cp.netPosition = -640;
    vi.mocked(useCounterpartyDetail).mockReturnValue(hook as never);

    render(<CounterpartyDetail counterpartyId="cp1" />);

    fireEvent.click(screen.getAllByRole('button', { name: /Settle up/ })[0]);
    expect(hook.openSettleUp).toHaveBeenCalledWith(-640);
  });

  it('hides Settle up once the balance is zero', () => {
    const hook = baseHookReturn([makeEntry()]);
    hook.cp.netPosition = 0;
    vi.mocked(useCounterpartyDetail).mockReturnValue(hook as never);

    render(<CounterpartyDetail counterpartyId="cp1" />);

    expect(screen.queryByRole('button', { name: /Settle up/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Edit Person/ })[0]).toBeInTheDocument();
  });
});

describe('CounterpartyDetail action bar — desktop card + mobile bar', () => {
  const ACTIONS = ['Add Entry', 'Settle up', 'Export', 'Edit Person', 'Delete Person'] as const;

  it('renders every action in both the desktop card and the mobile bar', () => {
    const hook = baseHookReturn([makeEntry()]);
    hook.cp.netPosition = 500;
    vi.mocked(useCounterpartyDetail).mockReturnValue(hook as never);

    render(<CounterpartyDetail counterpartyId="cp1" />);

    const mobileBar = within(screen.getByTestId('action-bar'));
    for (const name of ACTIONS) {
      // The mobile ledger card header keeps its own Add Entry button, hence three.
      const copies = name === 'Add Entry' ? 3 : 2;
      expect(screen.getAllByRole('button', { name: new RegExp(`^${name}$`) })).toHaveLength(copies);
      expect(mobileBar.getByRole('button', { name: new RegExp(`^${name}$`) })).toBeInTheDocument();
    }
  });

  it('Add Entry opens the add-entry dialog', () => {
    const hook = baseHookReturn([makeEntry()]);
    vi.mocked(useCounterpartyDetail).mockReturnValue(hook as never);

    render(<CounterpartyDetail counterpartyId="cp1" />);

    fireEvent.click(screen.getAllByRole('button', { name: /^Add Entry$/ })[0]);
    expect(hook.setAddEntryOpen).toHaveBeenCalledWith(true);
  });

  it('disables Export in both places while the ledger has no entries', () => {
    vi.mocked(useCounterpartyDetail).mockReturnValue(baseHookReturn([]) as never);

    render(<CounterpartyDetail counterpartyId="cp1" />);

    const exports = screen.getAllByRole('button', { name: /^Export$/ });
    expect(exports).toHaveLength(2);
    exports.forEach((b) => {
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute('title', 'Add an entry first');
    });
  });

  it('Export opens the export dialog with the loaded entries and the person prefilled', () => {
    vi.mocked(useCounterpartyDetail).mockReturnValue(
      baseHookReturn([makeEntry({ id: 'l1', amount: 500, runningBalance: 500 })]) as never,
    );

    render(<CounterpartyDetail counterpartyId="cp1" myName="Adarsh" />);
    expect(screen.queryByRole('heading', { name: 'Export ledger' })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /^Export$/ })[0]);

    expect(screen.getByRole('heading', { name: 'Export ledger' })).toBeInTheDocument();
    expect(screen.getByLabelText('Their name')).toHaveValue('Rahul');
    expect(screen.getByLabelText('Your name')).toHaveValue('Adarsh');
    expect(screen.getByTestId('ledger-export-preview')).toHaveTextContent('Adarsh lent Rahul · ₹500.00');
  });
});

describe('CounterpartyDetail export deep link', () => {
  it('opens the export dialog straight away when asked to (?export=1 from the push)', () => {
    vi.mocked(useCounterpartyDetail).mockReturnValue(baseHookReturn([makeEntry()]) as never);
    render(<CounterpartyDetail counterpartyId="cp1" myName="Adarsh" openExport />);
    expect(screen.getByRole('heading', { name: 'Export ledger' })).toBeInTheDocument();
  });

  it('stays closed by default', () => {
    vi.mocked(useCounterpartyDetail).mockReturnValue(baseHookReturn([makeEntry()]) as never);
    render(<CounterpartyDetail counterpartyId="cp1" myName="Adarsh" />);
    expect(screen.queryByRole('heading', { name: 'Export ledger' })).not.toBeInTheDocument();
  });
});
