import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { employer, summary as epfSummary } from '@/features/investments/epf/epf.fixtures';
import { npsAccount, npsSummary } from '@/features/investments/retirement/retirement.fixtures';
import { RetirementCard } from '@/features/investments/retirement/RetirementCard';
import { retirementModel } from '@/features/investments/retirement/retirementModel';
import type { LoanRow } from '@/features/loans/list/loansListModel';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import DsAccountsPage from './page';
import { openScreen, type PlainListData, resolveDeep, toStreams } from './streamedTestUtils';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/accounts',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/features/loans/form/LoanFormDialog', () => ({
  LoanFormDialog: ({ onClose }: { onClose: () => void }) => (
    <div>
      <p>loan dialog</p>
      <button onClick={onClose}>close loan</button>
    </div>
  ),
}));
vi.mock('@/features/loans/list/closedLoanActions', () => ({ loadClosedLoans: vi.fn() }));

const loadMock = vi.fn<() => PlainListData>();
vi.mock('@/features/accounts/list/accountsListData', () => ({
  loadAccountsListData: () => toStreams(loadMock()),
}));

const accounts: Account[] = [
  { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC Savings', last4: '4521', balance: 1000 },
  { id: 'c1', type: AccountType.CREDIT_CARD, name: 'Axis Magnus', last4: '9911', creditLimit: 100000, effectiveCreditLimit: 100000, balance: -20000 },
  { id: 'k1', type: AccountType.BROKER, name: 'Zerodha', balance: 5000, cashBalance: 300 },
  { id: 'w1', type: AccountType.GENERIC, name: 'Wallet', financialPosition: 'asset', balance: 200 },
];

const child = npsAccount({ id: 'a2', relation: 'CHILD', sector: 'VATSALYA', holderName: 'Aarav', pranMasked: 'XXXXXXX5208', tier1Status: null, tiers: [{ tier: 'I', value: 95260, invested: 1, gain: 1, schemes: [] }] });
const model = () => retirementModel(epfSummary(), [employer()], npsSummary([npsAccount(), child], { a1: '2026-11-05', a2: '2026-08-31' }));

const loan = (id: string, name: string): LoanRow => ({
  id, name, lender: 'SBI', kind: 'home', rate: '8% fixed', emi: '36,603', outstanding: '41,92,327', progressPct: 10,
  progressText: '13 of 240', next: { kind: 'date', label: '5 Nov' }, phoneSub: 'sub', closed: false, href: `/loans/${id}`,
});

function data(over: Partial<PlainListData> = {}): PlainListData {
  return { accounts, bills: [], rewards: [], netWorth: 5000000, dayChangePct: 0.59, retirement: { ok: true, data: model() }, loans: { rows: [], closedLine: null }, ...over };
}

async function renderPage() {
  const ui = await DsAccountsPage();
  return render((await resolveDeep(openScreen(ui))) as React.ReactElement);
}

const before = (a: HTMLElement, b: HTMLElement) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('/accounts as the balance sheet', () => {
  beforeEach(() => {
    loadMock.mockReset();
    push.mockReset();
  });

  it('orders cards first, then banks, brokers and wallets, retirement and loans, with no group headings', async () => {
    loadMock.mockReturnValue(data({ loans: { rows: [loan('l1', 'Home Loan')], closedLine: null } }));
    await renderPage();
    const order = ['Credit cards', 'Bank accounts', 'Brokers', 'Wallets & cash', 'EPF & NPS', 'Loans'].map((t) => screen.getByText(t));
    order.slice(1).forEach((el, i) => expect(before(order[i], el)).toBe(true));
    expect(screen.queryByText('What you have')).not.toBeInTheDocument();
    expect(screen.queryByText('What you owe')).not.toBeInTheDocument();
  });

  it('shows the Investments figure as brokers + EPF + your own NPS, leaving the child account out', async () => {
    loadMock.mockReturnValue(data());
    await renderPage();
    // 5,000 brokers + 8,43,210 EPF + 5,94,880 NPS; the child's 95,260 is not counted.
    expect(screen.getByText('₹14,43,090')).toBeInTheDocument();
    expect(screen.getByText('+0.59%')).toBeInTheDocument();
  });

  it('falls back to the brokers alone when retirement could not be read, and says so in the card', async () => {
    loadMock.mockReturnValue(data({ retirement: { ok: false, reference: 'r1' } }));
    await renderPage();
    expect(screen.getByText('₹5,000')).toBeInTheDocument();
    expect(screen.getByText("Couldn't load retirement")).toBeInTheDocument();
  });

  it('draws the same Retirement card as Investments, with rows linking to EPF and NPS', async () => {
    loadMock.mockReturnValue(data());
    await renderPage();
    expect(screen.getByText('EPF passbook + NPS statements')).toBeInTheDocument();
    for (const t of ['UAN ••4321', 'PRAN ••7731', 'NPS Vatsalya', 'For Aarav', '₹8,43,210', '₹5,94,880', '₹95,260']) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    }
    fireEvent.click(screen.getAllByText('EPF')[0]);
    expect(push).toHaveBeenLastCalledWith('/investments/epf');
    fireEvent.click(screen.getAllByText('NPS Vatsalya')[0]);
    expect(push).toHaveBeenLastCalledWith('/investments/nps?account=a2');

    const accountsRows = screen.getAllByText(/PRAN ••|UAN ••/).map((n) => n.textContent);
    document.body.innerHTML = '';
    render(<RetirementCard model={model()} />);
    expect(screen.getAllByText(/PRAN ••|UAN ••/).map((n) => n.textContent)).toEqual(accountsRows);
  });

  it('keeps an upload line on the Retirement card when nothing is added', async () => {
    loadMock.mockReturnValue(data({ retirement: { ok: true, data: retirementModel(epfSummary({ hasData: false }), [], npsSummary([])) } }));
    await renderPage();
    expect(screen.getAllByRole('link', { name: 'Upload passbook' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Upload statement' }).length).toBeGreaterThan(0);
  });

  it('lists each open loan in the Loans card, opens one, and links All loans to /loans', async () => {
    loadMock.mockReturnValue(data({ loans: { rows: [loan('l1', 'Home Loan'), loan('l2', 'Car Loan')], closedLine: null } }));
    await renderPage();
    expect(screen.getAllByText('Home Loan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Car Loan').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'All loans' })).toHaveAttribute('href', '/loans');
    fireEvent.click(screen.getAllByText('Car Loan')[0]);
    expect(push).toHaveBeenCalledWith('/loans/l2');
  });

  it('with no loans says No loans and Add loan opens the loan form in place', async () => {
    loadMock.mockReturnValue(data());
    await renderPage();
    expect(screen.getByText('No loans')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All loans' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add loan' }));
    expect(await screen.findByText('loan dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByText('close loan'));
    expect(screen.queryByText('loan dialog')).toBeNull();
  });

  it('shows a closed-loans line under the Loans card when there are closed loans', async () => {
    loadMock.mockReturnValue(data({ loans: { rows: [loan('l1', 'Home Loan')], closedLine: 'Closed · 2' } }));
    await renderPage();
    expect(screen.getByText('Closed · 2')).toBeInTheDocument();
  });

  it('says it could not load loans when the loans fail, keeping the rest of the page', async () => {
    loadMock.mockReturnValue(data({ loans: null }));
    await renderPage();
    expect(screen.getByText("Couldn't load loans")).toBeInTheDocument();
    expect(screen.getByText('Credit cards')).toBeInTheDocument();
  });
});
