import { describe, expect, it } from 'vitest';

import type { SmsAccountLines, SmsLine } from '@/lib/sms.types';

import {
  accountIsOn,
  defaultSyncFrom,
  dmy,
  feedText,
  groupUnassigned,
  linesToTurnOn,
  messagesText,
  notSyncedText,
  readSummary,
  reportCounts,
  reportVisible,
  senderGroupText,
  sendersText,
  sortAccounts,
} from './smsModel';

function line(over: Partial<SmsLine> = {}): SmsLine {
  return {
    id: 'l1',
    sender: 'TESTBK',
    provider: 'Test Bank',
    kind: null,
    ending: '123',
    family: null,
    msgCount: 5,
    txnCount: 4,
    firstMsgAt: '2026-09-25T10:00:00Z',
    lastMsgAt: '2026-11-10T10:00:00Z',
    state: 'OFF',
    syncFrom: null,
    isNew: false,
    accountId: null,
    suggestedAccountId: null,
    ...over,
  };
}

function account(over: Partial<SmsAccountLines> = {}): SmsAccountLines {
  return {
    accountId: 'a1',
    name: 'Test account',
    type: 'GENERIC',
    lastTransactionDate: null,
    last60Days: { statement: 0, emailAlert: 0, manual: 0 },
    lines: [line()],
    ...over,
  };
}

describe('dmy', () => {
  it('formats plain dates and IST instants as dd/mm/yyyy', () => {
    expect(dmy('2026-11-05')).toBe('05/11/2026');
    expect(dmy('2026-11-05T20:00:00Z')).toBe('06/11/2026');
    expect(dmy(null)).toBe('');
  });
});

describe('text helpers', () => {
  it('lists each sender once with its endings', () => {
    const lines = [line({ ending: '123' }), line({ id: 'l2', ending: '4567' }), line({ id: 'l3', sender: 'OTHER', ending: null })];
    expect(sendersText(lines)).toBe('TESTBK ••123, ••4567 · OTHER');
  });

  it('counts messages and names the last day', () => {
    const lines = [line({ msgCount: 5 }), line({ id: 'l2', msgCount: 1, lastMsgAt: '2026-11-12T10:00:00Z' })];
    expect(messagesText(lines)).toBe('6 messages, last on 12/11/2026');
    expect(messagesText([line({ msgCount: 1, lastMsgAt: null })])).toBe('1 message');
  });

  it('says how the account is fed', () => {
    expect(feedText({ statement: 2, emailAlert: 1, manual: 0 })).toBe('Statements and email alerts in the last 60 days');
    expect(feedText({ statement: 2, emailAlert: 0, manual: 9 })).toBe('Statements in the last 60 days');
    expect(feedText({ statement: 0, emailAlert: 3, manual: 0 })).toBe('Email alerts in the last 60 days');
    expect(feedText({ statement: 0, emailAlert: 0, manual: 4 })).toBe('Entered by hand');
    expect(feedText({ statement: 0, emailAlert: 0, manual: 0 })).toBe('Nothing else feeds this account');
  });
});

describe('sortAccounts', () => {
  it('puts accounts with no statement and no email alert first, keeping order inside each group', () => {
    const fed = account({ accountId: 'fed', last60Days: { statement: 1, emailAlert: 0, manual: 0 } });
    const hand = account({ accountId: 'hand', last60Days: { statement: 0, emailAlert: 0, manual: 5 } });
    const none = account({ accountId: 'none' });
    const alerts = account({ accountId: 'alerts', last60Days: { statement: 0, emailAlert: 2, manual: 0 } });
    expect(sortAccounts([fed, hand, alerts, none]).map((a) => a.accountId)).toEqual(['hand', 'none', 'fed', 'alerts']);
  });
});

describe('switch state', () => {
  it('is on when any line is on', () => {
    expect(accountIsOn(account({ lines: [line({ state: 'ON' }), line({ id: 'l2', state: 'ON' })] }))).toBe(true);
    expect(accountIsOn(account({ lines: [line({ state: 'ON' }), line({ id: 'l2', state: 'OFF' })] }))).toBe(true);
    expect(accountIsOn(account({ lines: [line({ state: 'OFF' }), line({ id: 'l2', state: 'OFF' })] }))).toBe(false);
    expect(accountIsOn(account({ lines: [] }))).toBe(false);
  });

  it('counts the numbers not synced', () => {
    const mixed = account({ lines: [line({ state: 'ON' }), line({ id: 'l2' }), line({ id: 'l3' })] });
    expect(notSyncedText(mixed)).toBe('2 numbers not synced');
    expect(notSyncedText(account({ lines: [line({ state: 'ON' }), line({ id: 'l2' })] }))).toBe('1 number not synced');
    expect(notSyncedText(account({ lines: [line({ state: 'ON' })] }))).toBe('');
  });

  it('turns on only the lines that are not on', () => {
    const a = account({ lines: [line({ id: 'on', state: 'ON' }), line({ id: 'off', state: 'OFF' })] });
    expect(linesToTurnOn(a).map((l) => l.id)).toEqual(['off']);
  });
});

describe('defaultSyncFrom', () => {
  it('is the day after the last transaction', () => {
    expect(defaultSyncFrom(account({ lastTransactionDate: '2026-10-31' }))).toBe('2026-11-01');
    expect(defaultSyncFrom(account({ lastTransactionDate: '2026-12-31' }))).toBe('2027-01-01');
  });

  it('is the first message of the lines being turned on when the account has no transactions', () => {
    const a = account({
      lines: [
        line({ id: 'on', state: 'ON', firstMsgAt: '2026-01-01T10:00:00Z' }),
        line({ id: 'a', firstMsgAt: '2026-10-05T10:00:00Z' }),
        line({ id: 'b', firstMsgAt: '2026-09-25T10:00:00Z' }),
      ],
    });
    expect(defaultSyncFrom(a)).toBe('2026-09-25');
  });
});

describe('groupUnassigned', () => {
  it('keeps a sender with one line plain and groups a sender with several', () => {
    const lines = [
      line({ id: 'a1', sender: 'ALPHA', ending: '1', msgCount: 10, lastMsgAt: '2026-11-01T10:00:00Z' }),
      line({ id: 'b1', sender: 'BETA', ending: '9', msgCount: 4 }),
      line({ id: 'a2', sender: 'ALPHA', ending: '2', msgCount: 30, lastMsgAt: '2026-11-09T10:00:00Z' }),
    ];
    const { items, rare } = groupUnassigned(lines);
    expect(rare).toEqual([]);
    expect(items).toHaveLength(2);
    const group = items[0];
    expect(group.kind).toBe('sender');
    if (group.kind === 'sender') {
      expect(group.lines.map((l) => l.id)).toEqual(['a1', 'a2']);
      expect(group.messageCount).toBe(40);
      expect(group.lastMsgAt).toBe('2026-11-09T10:00:00Z');
      expect(senderGroupText(group)).toBe('2 numbers, 40 messages, last on 09/11/2026');
    }
    expect(items[1]).toMatchObject({ kind: 'line', key: 'b1' });
  });

  it('moves lines with fewer than three messages into one group, before grouping by sender', () => {
    const lines = [
      line({ id: 'a1', sender: 'ALPHA', msgCount: 1 }),
      line({ id: 'a2', sender: 'ALPHA', msgCount: 2 }),
      line({ id: 'a3', sender: 'ALPHA', msgCount: 3 }),
    ];
    const { items, rare } = groupUnassigned(lines);
    expect(rare.map((l) => l.id)).toEqual(['a1', 'a2']);
    expect(items).toEqual([{ kind: 'line', key: 'a3', line: lines[2] }]);
  });

  it('returns nothing for no lines', () => {
    expect(groupUnassigned([])).toEqual({ items: [], rare: [] });
  });
});

describe('report', () => {
  const row = { accountId: 'a', name: 'A', firstMessageAt: null, lastMessageAt: null, wouldCreate: 3, wouldAttach: 2, created: 1, attached: 5, duplicates: 4, needsConfirm: 6, couldNotRead: 7, alerts: [] };

  it('words the shadow counts, and the posted counts once posting is on', () => {
    expect(reportCounts(row, false)).toBe("Would add 3, already in FinanceOS 2, second alerts 4, needs your check 6, couldn't read 7");
    expect(reportCounts(row, true)).toBe("Added 1, already in FinanceOS 5, second alerts 4, needs your check 6, couldn't read 7");
  });

  it('hides when nothing is stored', () => {
    const totals = { stored: 0, read: 0, needsConfirm: 0, couldNotRead: 0, ignored: 0, wouldCreate: 0, wouldAttach: 0, created: 0, attached: 0, duplicates: 0 };
    expect(reportVisible(null)).toBe(false);
    expect(reportVisible({ postingEnabled: false, totals, accounts: [row] })).toBe(false);
    expect(reportVisible({ postingEnabled: false, totals: { ...totals, stored: 2 }, accounts: [row] })).toBe(true);
  });
});

describe('readSummary', () => {
  it('joins what was read', () => {
    expect(readSummary({ amount: 1250, direction: 'debit', txnDate: '2026-11-05', counterparty: 'Corner shop' })).toBe('₹1,250 debit · 05/11/2026 · Corner shop');
    expect(readSummary({ amount: null, direction: null, txnDate: null, counterparty: null })).toBe('');
  });
});
