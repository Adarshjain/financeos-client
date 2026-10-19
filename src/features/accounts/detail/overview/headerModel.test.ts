import { describe, expect, it } from 'vitest';

import type { BankAccount, Broker, CreditCard, GenericAccount } from '@/lib/account.types';
import type { CardBillResponse } from '@/lib/api/types';
import { AccountType } from '@/lib/types';

import { buildHeaderModel, reconciliationBanner } from './headerModel';

const TODAY = '2026-10-13';

const card: CreditCard = {
  id: 'c1',
  type: AccountType.CREDIT_CARD,
  name: 'HDFC Regalia',
  last4: '7741',
  creditLimit: 300000,
  balance: -44319,
};

function bill(over: Partial<CardBillResponse> = {}): CardBillResponse {
  return {
    accountId: 'c1',
    accountName: 'HDFC Regalia',
    muted: false,
    paidSource: 'NONE',
    status: 'OPEN',
    statementId: 's1',
    paymentDueDate: '2026-10-25',
    totalAmountDue: 44319,
    remainingAmount: 44319,
    unbilledAmount: 0,
    ...over,
  };
}

describe('buildHeaderModel for a card', () => {
  it('shows what is owed with the due date and unbilled spend, and allows Mark paid', () => {
    const m = buildHeaderModel(card, bill(), TODAY);
    expect(m.label).toBe('You owe');
    expect(m.figure).toBe('₹44,319');
    expect(m.caption).toEqual(['due 25 Oct', 'unbilled ₹0']);
    expect(m.badge).toBeUndefined();
    expect(m.markPaid).toEqual({ statementId: 's1', remaining: 44319 });
    expect(m.showImport).toBe(true);
  });

  it.each(['OPEN', 'PARTIAL', 'OVERDUE'] as const)('allows Mark paid when %s', (status) => {
    expect(buildHeaderModel(card, bill({ status }), TODAY).markPaid).not.toBeNull();
  });

  it('keeps Mark paid off when the due date is unknown, but still shows the owed figure', () => {
    const m = buildHeaderModel(card, bill({ status: 'DUE_UNKNOWN', paymentDueDate: null }), TODAY);
    expect(m.markPaid).toBeNull();
    expect(m.label).toBe('You owe');
    expect(m.caption).toEqual(['unbilled ₹0']);
  });

  it('shows the unbilled spend, a No bill due badge and the last paid bill when nothing is due', () => {
    const m = buildHeaderModel(
      { ...card, balance: -6224 },
      bill({
        status: 'PAID',
        unbilledAmount: 6224,
        totalAmountDue: 46800,
        paidMarkedOn: '2026-09-18',
        nextStatementExpectedOn: '2026-11-05',
      }),
      TODAY
    );
    expect(m.label).toBe('Unbilled so far');
    expect(m.figure).toBe('₹6,224');
    expect(m.badge).toBe('No bill due');
    expect(m.caption).toEqual(['next statement 5 Nov', 'last bill ₹46,800 paid 18 Sep']);
    expect(m.markPaid).toBeNull();
  });

  it('leaves out caption parts it does not know', () => {
    const m = buildHeaderModel(card, bill({ status: 'AWAITING_STATEMENT', unbilledAmount: 100 }), TODAY);
    expect(m.caption).toEqual([]);
    expect(m.figure).toBe('₹100');
  });

  it('labels a card in credit and floors a missing balance at zero owed', () => {
    expect(buildHeaderModel({ ...card, balance: 500 }, bill(), TODAY)).toMatchObject({
      label: 'In credit',
      figure: '₹500',
    });
    expect(buildHeaderModel({ ...card, balance: undefined }, bill(), TODAY).figure).toBe('₹0');
  });

  it('falls back to the owed figure with no actions when the bills request failed', () => {
    const m = buildHeaderModel(card, null, TODAY);
    expect(m).toMatchObject({ label: 'You owe', figure: '₹44,319', caption: [], markPaid: null });
  });

  it('hides Mark paid and Import and says when it closed', () => {
    const m = buildHeaderModel({ ...card, closedOn: '2026-06-30' }, bill(), TODAY);
    expect(m.markPaid).toBeNull();
    expect(m.showImport).toBe(false);
    expect(m.closedLabel).toBe('Closed 30 Jun 2026');
  });

  it('keeps a closing card open until the date passes', () => {
    const m = buildHeaderModel({ ...card, closedOn: '2026-10-31' }, bill(), TODAY);
    expect(m.closedLabel).toBeUndefined();
    expect(m.markPaid).not.toBeNull();
  });
});

describe('buildHeaderModel for other types', () => {
  const bank: BankAccount = { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC', balance: 120000 };

  it('shows a bank balance, anchored to its statement, with Import', () => {
    const m = buildHeaderModel({ ...bank, balanceAnchored: true, anchorDate: '2026-10-05' }, null, TODAY);
    expect(m).toMatchObject({
      label: 'Balance',
      figure: '₹1,20,000',
      caption: ['as of statement 5 Oct'],
      showImport: true,
      markPaid: null,
    });
  });

  it('falls back to the opening balance and leaves the caption out when not anchored', () => {
    const m = buildHeaderModel(
      { ...bank, balance: null, openingBalance: '2500' },
      null,
      TODAY
    );
    expect(m.figure).toBe('₹2,500');
    expect(m.caption).toEqual([]);
  });

  it('hides Import for a closed bank account', () => {
    expect(buildHeaderModel({ ...bank, closedOn: '2026-01-01' }, null, TODAY).showImport).toBe(false);
  });

  it('labels a broker Portfolio value and a wallet Balance, neither with Import', () => {
    const broker: Broker = { id: 'k1', type: AccountType.BROKER, name: 'Zerodha', balance: 50000 };
    const wallet: GenericAccount = { id: 'w1', type: AccountType.GENERIC, name: 'Cash', balance: 200 };
    expect(buildHeaderModel(broker, null, TODAY)).toMatchObject({
      label: 'Portfolio value',
      figure: '₹50,000',
      showImport: false,
    });
    expect(buildHeaderModel(wallet, null, TODAY)).toMatchObject({
      label: 'Balance',
      figure: '₹200',
      showImport: false,
    });
  });
});

describe('reconciliationBanner', () => {
  it('states the gap, with paise only when there are some', () => {
    expect(reconciliationBanner(1200)?.title).toBe('Statement and ledger disagree by ₹1,200.');
    expect(reconciliationBanner(-12.5)?.title).toBe('Statement and ledger disagree by ₹12.50.');
    expect(reconciliationBanner(1200)?.body).toBe(
      'Usually a missing opening balance or a duplicated transfer.',
    );
  });

  it('is null with no gap', () => {
    expect(reconciliationBanner(0)).toBeNull();
    expect(reconciliationBanner(null)).toBeNull();
    expect(reconciliationBanner(undefined)).toBeNull();
  });
});
