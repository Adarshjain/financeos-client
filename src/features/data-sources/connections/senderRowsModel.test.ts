import { describe, expect, it } from 'vitest';

import type { GmailSenderResponse } from '@/lib/api/types';

import { groupSenderRows, senderDomain } from './senderRowsModel';

const s = (id: string, senderAddress: string, bankId: string | null = null, enabled = true) =>
  ({ id, senderAddress, bankId, enabled, name: null }) as GmailSenderResponse;

describe('groupSenderRows', () => {
  it('groups senders with a bank into one row, in first-seen order, and keeps the rest single', () => {
    const rows = groupSenderRows([s('1', 'a@x.com'), s('2', 'hdfcbank.net', 'hdfc'), s('3', 'b@y.com'), s('4', 'alerts@hdfcbank.bank.in', 'hdfc')]);
    expect(rows.map((r) => r.kind)).toEqual(['sender', 'bank', 'sender']);
    const bank = rows[1];
    expect(bank.kind === 'bank' && bank.senders.map((x) => x.id)).toEqual(['2', '4']);
    expect(bank.kind === 'bank' && bank.bankName).toBe('HDFC Bank');
  });

  it('says "and N more" only when the group has more than one sender', () => {
    const one = groupSenderRows([s('1', 'alerts@icicibank.com', 'icici')])[0];
    const three = groupSenderRows([s('1', 'icicibank.com', 'icici'), s('2', 'a@icici.bank.in', 'icici'), s('3', 'b@x.com', 'icici')])[0];
    expect(one.kind === 'bank' && one.summary).toBe('Any address at icicibank.com');
    expect(three.kind === 'bank' && three.summary).toBe('Any address at icicibank.com and 2 more');
  });

  it('is On when any sender in the group is on', () => {
    const row = groupSenderRows([s('1', 'a.com', 'sbi', false), s('2', 'b.com', 'sbi', true)])[0];
    expect(row.kind === 'bank' && row.enabled).toBe(true);
  });

  it('takes the domain after the @ or the bare domain', () => {
    expect(senderDomain('a@b.com')).toBe('b.com');
    expect(senderDomain('b.com')).toBe('b.com');
  });
});
