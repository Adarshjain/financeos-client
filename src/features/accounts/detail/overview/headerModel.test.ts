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
    missingDetails: [],
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
    expect(m.label).toBe('Amount you owe');
    expect(m.figure).toBe('₹44,319');
    expect(m.info).toBeUndefined();
    expect(m.markPaid).toEqual({ statementId: 's1', remaining: 44319 });
  });

  it.each(['OPEN', 'PARTIAL', 'OVERDUE'] as const)('allows Mark paid when %s', (status) => {
    expect(buildHeaderModel(card, bill({ status }), TODAY).markPaid).not.toBeNull();
  });

  it('keeps Mark paid off when the due date is unknown, but still shows the owed figure', () => {
    const m = buildHeaderModel(card, bill({ status: 'DUE_UNKNOWN', paymentDueDate: null }), TODAY);
    expect(m.markPaid).toBeNull();
    expect(m.label).toBe('Amount you owe');
    expect(m.info).toBeUndefined();
  });

  it('shows the unbilled spend and the next statement date when nothing is due', () => {
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
    expect(m.info).toBe('Next statement 5 Nov');
    expect(m.markPaid).toBeNull();
  });

  it('shows the next statement date beside an owed bill when known', () => {
    expect(buildHeaderModel(card, bill({ nextStatementExpectedOn: '2026-11-05' }), TODAY).info).toBe('Next statement 5 Nov');
  });

  it('leaves out the info it does not know', () => {
    const m = buildHeaderModel(card, bill({ status: 'AWAITING_STATEMENT', unbilledAmount: 100 }), TODAY);
    expect(m.info).toBeUndefined();
    expect(m.figure).toBe('₹100');
  });

  it('tones the owed headline danger, and leaves in-credit and unbilled neutral', () => {
    expect(buildHeaderModel(card, bill(), TODAY).figureTone).toBe('danger');
    expect(buildHeaderModel(card, null, TODAY).figureTone).toBe('danger');
    expect(buildHeaderModel({ ...card, balance: 500 }, bill(), TODAY).figureTone).toBeUndefined();
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
    expect(m).toMatchObject({ label: 'Amount you owe', figure: '₹44,319', markPaid: null });
  });

  it('hides Mark paid and says when it closed', () => {
    const m = buildHeaderModel({ ...card, closedOn: '2026-06-30' }, bill(), TODAY);
    expect(m.markPaid).toBeNull();
    expect(m.info).toBe('Closed 30 Jun 26');
  });

  it('keeps a closing card open until the date passes', () => {
    const m = buildHeaderModel({ ...card, closedOn: '2026-10-31' }, bill(), TODAY);
    expect(m.info).toBeUndefined();
    expect(m.markPaid).not.toBeNull();
  });
});

describe('buildHeaderModel for other types', () => {
  const bank: BankAccount = { id: 'b1', type: AccountType.BANK_ACCOUNT, name: 'HDFC', balance: 120000 };

  it('shows a bank balance, anchored to its statement', () => {
    const m = buildHeaderModel({ ...bank, balanceAnchored: true, anchorDate: '2026-10-05' }, null, TODAY);
    expect(m).toMatchObject({
      label: 'Balance',
      figure: '₹1,20,000',
      info: 'as of statement 5 Oct',
      markPaid: null,
    });
  });

  it('says the balance is current to the newest later transaction, else to the statement', () => {
    const anchored = { ...bank, balanceAnchored: true, anchorDate: '2026-10-05' };
    expect(buildHeaderModel({ ...anchored, lastTransactionDate: '2026-10-10' }, null, TODAY).info).toBe('as of 10 Oct');
    expect(buildHeaderModel({ ...anchored, lastTransactionDate: '2026-10-03' }, null, TODAY).info).toBe('as of statement 5 Oct');
    expect(buildHeaderModel({ ...anchored, lastTransactionDate: null }, null, TODAY).info).toBe('as of statement 5 Oct');
    expect(buildHeaderModel({ ...anchored, lastTransactionDate: TODAY }, null, TODAY).info).toBe('as of today');
    expect(buildHeaderModel({ ...anchored, anchorDate: TODAY, lastTransactionDate: null }, null, TODAY).info).toBe('as of statement today');
    // A transaction dated after today is not in the balance yet.
    expect(buildHeaderModel({ ...anchored, lastTransactionDate: '2026-10-20' }, null, TODAY).info).toBe('as of statement 5 Oct');
  });

  it('falls back to the opening balance and leaves the info out when not anchored', () => {
    const m = buildHeaderModel(
      { ...bank, balance: null, openingBalance: '2500' },
      null,
      TODAY
    );
    expect(m.figure).toBe('₹2,500');
    expect(m.info).toBeUndefined();
  });

  it('labels a broker Portfolio value and a wallet Balance', () => {
    const broker: Broker = { id: 'k1', type: AccountType.BROKER, name: 'Zerodha', balance: 50000 };
    const wallet: GenericAccount = { id: 'w1', type: AccountType.GENERIC, name: 'Cash', balance: 200 };
    expect(buildHeaderModel(broker, null, TODAY)).toMatchObject({
      label: 'Portfolio value',
      figure: '₹50,000',
    });
    expect(buildHeaderModel(wallet, null, TODAY)).toMatchObject({
      label: 'Balance',
      figure: '₹200',
    });
    expect(buildHeaderModel(wallet, null, TODAY, '2026-10-10').info).toBe('last entry 10 Oct');
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
