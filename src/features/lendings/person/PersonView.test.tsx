import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/ds/loans/lendings/p1',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));
vi.mock('@/lib/query/hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [{ id: 'a1', name: 'HDFC Savings' }] }),
}));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const m = vi.hoisted(() => {
  const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });
  return {
    updateCp: mutation(),
    deleteCp: mutation(),
    createLending: mutation(),
    updateLending: mutation(),
    deleteLending: mutation(),
    linkTransaction: mutation(),
    unlinkTransaction: mutation(),
  };
});
vi.mock('../useCounterpartyMutations', () => ({ useCounterpartyMutations: () => m }));
vi.mock('../useLendingTransactionLink', () => ({
  useLinkLendingTransaction: () => m.linkTransaction,
  useUnlinkLendingTransaction: () => m.unlinkTransaction,
}));
// Settle up and Add lending have their own tests; the page only has to open them for this person.
vi.mock('../SettleDialog', () => ({
  SettleDialog: (p: { name: string; direction: string; balance: number; onRecorded?: () => void; onOpenChange: (o: boolean) => void }) => (
    <div>
      <p>{`settle ${p.name} ${p.direction} ${p.balance}`}</p>
      <button onClick={p.onRecorded}>recorded</button>
      <button onClick={() => p.onOpenChange(false)}>close settle</button>
    </div>
  ),
}));
vi.mock('../form/AddLendingDialog', () => ({
  AddLendingDialog: (p: { initialPerson?: { name: string } }) => <p>{`add entry for ${p.initialPerson?.name ?? 'nobody'}`}</p>,
}));
vi.mock('@/features/transactions/TransactionPickerField', () => ({
  TransactionPickerField: (p: { value: { id: string } | null; onSelect: (t: unknown) => void; onClear: () => void }) => (
    <div>
      <span>{p.value ? `picked ${p.value.id}` : 'no transaction'}</span>
      <button type="button" onClick={() => p.onSelect({ id: 'tx9', amount: 100, date: '2026-10-12', accountId: 'a1' })}>Pick tx9</button>
      <button type="button" onClick={p.onClear}>Remove tx</button>
    </div>
  ),
}));
const loadPersonMatches = vi.hoisted(() => vi.fn());
vi.mock('./matchActions', () => ({ loadPersonMatches }));
const loadPersonLedger = vi.hoisted(() => vi.fn());
vi.mock('./ledgerActions', () => ({ loadPersonLedger }));

import { renderWithQuery } from '@/test/renderWithQuery';

import { AddLendingProvider } from '../form/AddLendingProvider';
import { entriesFixture, ledgerFixture, personFixture } from './personModel.fixtures';
import { PersonView, type PersonViewProps } from './PersonView';

const user = userEvent.setup({ pointerEventsCheck: 0 });

function renderView(props: Partial<PersonViewProps> = {}) {
  const all = entriesFixture();
  return renderWithQuery(
    <AddLendingProvider>
      <PersonView
        cp={personFixture({ entryCount: 4 })}
        ledger={ledgerFixture(all)}
        state={{ page: 0, size: 25 }}
        today="2026-10-13"
        myName="Adarsh"
        openExport={false}
        {...props}
      />
    </AddLendingProvider>,
  );
}

const topBarAdd = () => screen.getAllByRole('button', { name: 'Add' })[0];
const openMenu = () => user.click(screen.getAllByRole('button', { name: 'More actions' })[0]);
const row = (title: string) => screen.getAllByRole('button').find((b) => b.getAttribute('role') === 'button' && within(b).queryByText(title))!;

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(m) as (keyof typeof m)[]) {
    m[key].mutateAsync.mockResolvedValue({ id: 'x' });
    m[key].isPending = false;
  }
  loadPersonMatches.mockResolvedValue({ success: true, data: [] });
  loadPersonLedger.mockResolvedValue({ success: true, data: entriesFixture() });
});

describe('header', () => {
  it('shows who they are, who owes whom and the actions, on the top bar page', () => {
    renderView();
    expect(screen.getAllByText('Rahul Sharma').length).toBeGreaterThan(0);
    expect(screen.getByText('Owe & lend / Lendings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/ds/loans/lendings');
    expect(screen.getByText('College friend · 4 entries since May')).toBeInTheDocument();
    expect(screen.getByText('Owes you')).toBeInTheDocument();
    expect(screen.getByText('₹15,000')).toBeInTheDocument();
    expect(screen.getByText('expected 28 Oct · in 15 days')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settle up' })).toBeInTheDocument();
  });

  it('has no tabs, no Export button, no All time chip and no reminder row', () => {
    renderView();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
    expect(screen.queryByText('All time')).toBeNull();
    expect(screen.queryByText(/remind/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete person' })).toBeNull();
  });

  it('hides Settle up once the balance is zero', () => {
    renderView({ cp: personFixture({ netPosition: 0 }) });
    expect(screen.getAllByText('Settled').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Settle up' })).toBeNull();
  });

  it('Settle up opens the sheet for this person with the direction and balance', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Settle up' }));
    expect(screen.getByText('settle Rahul Sharma lent 15000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'recorded' }));
    expect(router.refresh).toHaveBeenCalled();
  });

  it('opens the sheet from the owing side when you owe them', () => {
    renderView({ cp: personFixture({ netPosition: -400 }) });
    fireEvent.click(screen.getByRole('button', { name: 'Settle up' }));
    expect(screen.getByText('settle Rahul Sharma borrowed 400')).toBeInTheDocument();
  });

  it('the top bar + opens Add ledger entry with this person already picked', () => {
    renderView();
    fireEvent.click(topBarAdd());
    expect(screen.getByText('add entry for Rahul Sharma')).toBeInTheDocument();
  });
});

describe('ledger', () => {
  it('lists the entries with Lent, Received and the running balance, and the totals line', () => {
    renderView();
    expect(screen.getByText('Running balance · positive means Rahul owes you')).toBeInTheDocument();
    expect(screen.getAllByText('Part repayment').length).toBeGreaterThan(0);
    expect(within(row('Part repayment')).getByText('Linked')).toBeInTheDocument();
    expect(within(row('Laptop advance')).queryByText('Linked')).toBeNull();
    expect(screen.getAllByText('Settled').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+10,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('25,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('15,000').length).toBeGreaterThan(0);
    expect(screen.getByText('Opening ₹0 · lent ₹26,800 · received ₹11,800 · closing ₹15,000')).toBeInTheDocument();
  });

  it('pages on the server: the Pager is above and below and asks the URL for the next page', () => {
    const all = entriesFixture();
    renderView({ ledger: { ...ledgerFixture(all, 3), entries: { ...ledgerFixture(all, 3).entries, totalElements: 60 } } });
    expect(screen.getAllByRole('button', { name: /next/i })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(router.push).toHaveBeenCalledWith('/ds/loans/lendings/p1?page=1', { scroll: false });
  });

  it('says so when the person has no entries', () => {
    renderView({ cp: personFixture({ entryCount: 0, netPosition: 0, firstEntryDate: null, linkedEntryCount: 0 }), ledger: ledgerFixture([]) });
    expect(screen.getByText('No ledger entries recorded for Rahul.')).toBeInTheDocument();
    expect(screen.queryByText(/^Opening/)).toBeNull();
  });
});

describe('expected return, person and matching cards', () => {
  it('shows the expected date with the Export ledger share row, and the person details', () => {
    renderView();
    expect(screen.getByText('28 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull();
    expect(screen.getByText('May 2026')).toBeInTheDocument();
    expect(screen.getAllByText('College friend').length).toBeGreaterThan(0);
  });

  it('shows how many entries are linked and that there is nothing suggested', () => {
    renderView();
    expect(screen.getByText('1 of 4 entries')).toBeInTheDocument();
    expect(screen.getByText('none right now')).toBeInTheDocument();
  });

  it('Find matches lists transfers for unlinked entries and Link links one, with Undo in the Toast', async () => {
    loadPersonMatches.mockResolvedValue({
      success: true,
      data: [
        {
          lendingId: 'e2',
          direction: 'lent',
          amount: 25000,
          entryDate: '2026-08-29',
          candidates: [{ id: 'tx5', accountId: 'a1', amount: -25000, date: '2026-08-29', description: 'UPI to Rahul' }],
        },
      ],
    });
    renderView();
    await user.click(screen.getByRole('button', { name: 'Find matches' }));
    expect(await screen.findByText('UPI to Rahul · ₹25,000')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(m.linkTransaction.mutateAsync).toHaveBeenCalledWith({ id: 'e2', transactionId: 'tx5' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Linked to Rahul Sharma', expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) }));
    (toast.mock.calls[0][1] as { action: { onSelect: () => void } }).action.onSelect();
    await waitFor(() => expect(m.unlinkTransaction.mutateAsync).toHaveBeenCalledWith('e2'));
  });

  it('Find matches is off when every entry is already linked', () => {
    renderView({ cp: personFixture({ entryCount: 4, linkedEntryCount: 4 }) });
    expect(screen.getByRole('button', { name: 'Find matches' })).toBeDisabled();
  });
});

describe('Export ledger', () => {
  it('opens from the menu with every entry ticked and the text preview', async () => {
    renderView();
    await openMenu();
    await user.click(await screen.findByRole('menuitem', { name: 'Export ledger' }));
    expect(await screen.findByTestId('export-selected-count')).toHaveTextContent('4 selected');
    expect((screen.getByTestId('ledger-export-preview') as HTMLTextAreaElement).value).toContain('Dinner split');
  });

  it('opens from the share row', async () => {
    renderView();
    await user.click(screen.getByRole('button', { name: 'Export ledger' }));
    expect(await screen.findByText('Pick the entries to include. The text below updates as you go.')).toBeInTheDocument();
  });

  it('opens on load with ?export=1', async () => {
    renderView({ openExport: true });
    expect(screen.getByRole('dialog', { name: 'Export ledger' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Your name')).toHaveValue('Adarsh');
  });

  it('loads the whole ledger only when it opens, showing a loading state meanwhile', async () => {
    let resolve!: (v: unknown) => void;
    loadPersonLedger.mockReturnValue(new Promise((r) => (resolve = r)));
    renderView();
    expect(loadPersonLedger).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Export ledger' }));
    expect(loadPersonLedger).toHaveBeenCalledWith('p1', 4);
    expect(screen.getByTestId('export-loading')).toBeInTheDocument();
    resolve({ success: true, data: entriesFixture() });
    expect(await screen.findByTestId('export-selected-count')).toHaveTextContent('4 selected');
    expect(screen.queryByTestId('export-loading')).toBeNull();
  });

  it('says so and closes when the ledger cannot be loaded', async () => {
    loadPersonLedger.mockResolvedValue({ success: false, error: { message: 'down' } });
    renderView({ openExport: true });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('down', { tone: 'danger' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('Export as text at the end of the totals line opens it', async () => {
    renderView();
    await user.click(screen.getByRole('button', { name: 'Export as text' }));
    expect(await screen.findByTestId('export-selected-count')).toBeInTheDocument();
  });

  it('is not offered before there is an entry', async () => {
    renderView({ cp: personFixture({ entryCount: 0, netPosition: 0 }), ledger: ledgerFixture([]) });
    expect(screen.getByRole('button', { name: 'Export ledger' })).toBeDisabled();
    await openMenu();
    expect(await screen.findByRole('menuitem', { name: 'Export ledger' })).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('edit person', () => {
  it('saves the new name and notes, says so and refreshes', async () => {
    renderView();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const name = await screen.findByLabelText('Name');
    expect(name).toHaveValue('Rahul Sharma');
    fireEvent.change(name, { target: { value: ' Rahul S ' } });
    fireEvent.change(screen.getByLabelText(/Notes/), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(m.updateCp.mutateAsync).toHaveBeenCalledWith({ name: 'Rahul S', notes: undefined }));
    expect(toast).toHaveBeenCalledWith('Person details updated');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('wants a name', async () => {
    renderView();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: ' ' } });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(m.updateCp.mutateAsync).not.toHaveBeenCalled();
  });
});

describe('delete person', () => {
  it('asks first, saying what goes, and returns to Lendings once deleted', async () => {
    renderView();
    await openMenu();
    await user.click(await screen.findByRole('menuitem', { name: 'Delete person' }));
    expect(await screen.findByText('Delete Rahul Sharma?')).toBeInTheDocument();
    expect(screen.getByText('Their whole ledger goes (4 entries).')).toBeInTheDocument();
    expect(m.deleteCp.mutateAsync).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete person' }));
    await waitFor(() => expect(m.deleteCp.mutateAsync).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Person deleted');
    expect(router.push).toHaveBeenCalledWith('/ds/loans/lendings');
  });

  it('can be cancelled', async () => {
    renderView();
    await openMenu();
    await user.click(await screen.findByRole('menuitem', { name: 'Delete person' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(m.deleteCp.mutateAsync).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('entries', () => {
  it('pressing a row opens its edit dialog, and saving updates it and refreshes', async () => {
    renderView();
    await user.click(row('Laptop advance'));
    expect(await screen.findByText('Edit ledger entry')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toHaveValue('25000');
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '26000' } });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(m.updateLending.mutateAsync).toHaveBeenCalledTimes(1));
    expect(m.updateLending.mutateAsync).toHaveBeenCalledWith({
      id: 'e2',
      body: expect.objectContaining({ direction: 'lent', kind: 'principal', amount: 26000, entryDate: '2026-08-29' }),
    });
    expect(m.linkTransaction.mutateAsync).not.toHaveBeenCalled();
    expect(m.unlinkTransaction.mutateAsync).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Entry updated');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('the pencil opens the same dialog', async () => {
    renderView();
    await user.click(screen.getByRole('button', { name: 'Edit Laptop advance' }));
    expect(await screen.findByText('Edit ledger entry')).toBeInTheDocument();
  });

  it('links a picked transaction after saving, and unlinks one that was removed', async () => {
    renderView();
    await user.click(row('Laptop advance'));
    await user.click(await screen.findByRole('button', { name: 'Pick tx9' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(m.linkTransaction.mutateAsync).toHaveBeenCalledWith({ id: 'e2', transactionId: 'tx9' }));
    await waitFor(() => expect(screen.queryByText('Edit ledger entry')).toBeNull());

    await user.click(row('Part repayment'));
    await user.click(await screen.findByRole('button', { name: 'Remove tx' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(m.unlinkTransaction.mutateAsync).toHaveBeenCalledWith('e3'));
  });

  it('removing the original transaction unlinks it before the entry is saved (a linked entry cannot change direction)', async () => {
    renderView();
    await user.click(row('Part repayment'));
    await user.click(await screen.findByRole('button', { name: 'Remove tx' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(m.updateLending.mutateAsync).toHaveBeenCalled());
    expect(m.unlinkTransaction.mutateAsync).toHaveBeenCalledWith('e3');
    expect(m.unlinkTransaction.mutateAsync.mock.invocationCallOrder[0]).toBeLessThan(
      m.updateLending.mutateAsync.mock.invocationCallOrder[0],
    );
    expect(toast).toHaveBeenCalledWith('Entry updated');
  });

  it('swapping the transaction unlinks the old one, saves, then links the new pick', async () => {
    renderView();
    await user.click(row('Part repayment'));
    await user.click(await screen.findByRole('button', { name: 'Pick tx9' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(m.linkTransaction.mutateAsync).toHaveBeenCalledWith({ id: 'e3', transactionId: 'tx9' }));
    const order = [m.unlinkTransaction, m.updateLending, m.linkTransaction].map((x) => x.mutateAsync.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('asks before deleting an entry, then deletes it, says so and refreshes', async () => {
    renderView();
    await user.click(row('Laptop advance'));
    await user.click(await screen.findByRole('button', { name: 'Delete entry' }));
    expect(await screen.findByText('Delete this lent entry of ₹25,000?')).toBeInTheDocument();
    expect(m.deleteLending.mutateAsync).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete entry' }));
    await waitFor(() => expect(m.deleteLending.mutateAsync).toHaveBeenCalledWith('e2'));
    expect(toast).toHaveBeenCalledWith('Entry deleted');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('a failed save keeps the dialog open', async () => {
    m.updateLending.mutateAsync.mockRejectedValue(new Error('boom'));
    renderView();
    await user.click(row('Laptop advance'));
    await user.click(await screen.findByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(m.updateLending.mutateAsync).toHaveBeenCalled());
    expect(screen.getByText('Edit ledger entry')).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalledWith('Entry updated');
  });
});
