import { describe, expect, it } from 'vitest';

import type { ObligationItem } from './obligations';
import { upcomingRowKeys } from './UpcomingList';

const item = (over: Record<string, unknown>) => ({ type: 'card_bill', ...over }) as unknown as ObligationItem;

describe('upcomingRowKeys', () => {
  it('keeps each row’s key when a row above it leaves', () => {
    const bill = item({ statementId: 's1' });
    const emi = item({ type: 'emi', loanId: 'l1', installmentSeq: 4 });
    const lend = item({ type: 'lending_due', counterpartyId: 'p1' });
    const before = upcomingRowKeys([bill, emi, lend]);
    const after = upcomingRowKeys([emi, lend]);
    expect(after).toEqual(before.slice(1));
  });

  it('tells two rows with the same identity apart', () => {
    const keys = upcomingRowKeys([item({ statementId: 's1' }), item({ statementId: 's1' })]);
    expect(new Set(keys).size).toBe(2);
  });
});
