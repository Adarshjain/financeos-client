import { describe, expect, it } from 'vitest';

import { pendingFor, rowButtons, rowMenuActions } from './inboxRowsModel';
import { action, DISMISS, item, SNOOZE } from './inboxTestUtils';

describe('rowButtons', () => {
  const nav = (type: string, label: string, href: string) => action({ type, label, href });

  it('upload, mark paid and reconnect are secondary', () => {
    const upload = item({ key: 'a', kind: 'statement_expected', actions: [nav('upload', 'Upload', '/transactions/import?account=1'), SNOOZE] });
    expect(rowButtons(upload)).toEqual([
      { id: 'upload-0', label: 'Upload', variant: 'secondary', href: '/transactions/import?account=1' },
    ]);
    const paid = item({
      key: 'b',
      actions: [action({ type: 'mark_paid', label: 'Mark paid', payload: { statementId: 's1' } }), SNOOZE, DISMISS],
    });
    expect(rowButtons(paid)).toEqual([
      { id: 'mark_paid-0', label: 'Mark paid', variant: 'secondary', bill: 'mark_paid', disabled: false },
    ]);
    const reconnect = item({ key: 'c', kind: 'gmail_reconnect', actions: [nav('reconnect', 'Reconnect', '/settings/gmail')] });
    expect(rowButtons(reconnect)[0]).toMatchObject({ label: 'Reconnect', variant: 'secondary', href: '/settings/connections' });
  });

  it('mark paid with no statement is disabled', () => {
    const row = item({ key: 'a', actions: [action({ type: 'mark_paid', label: 'Mark paid' })] });
    expect(rowButtons(row)[0].disabled).toBe(true);
  });

  it('emi and lending read Open as links', () => {
    for (const kind of ['emi', 'lending']) {
      const row = item({ key: kind, kind, actions: [nav('open', 'Open', '/loans/1')] });
      expect(rowButtons(row)).toEqual([{ id: 'open-0', label: 'Open', variant: 'link', href: '/loans/1' }]);
    }
  });

  it('statement details missing opens the Set details dialog', () => {
    const row = item({
      key: 'a',
      kind: 'statement_details_missing',
      refs: { statementId: 's9' },
      actions: [nav('open', 'Open', '/accounts/1/statements'), SNOOZE],
    });
    const [button] = rowButtons(row);
    expect(button).toMatchObject({ label: 'Set details', variant: 'link', bill: 'set_details' });
    expect(pendingFor(row, button)).toEqual({ type: 'set_details', statementId: 's9' });
  });

  it('a bill row whose due date is missing keeps its set_details action as a link', () => {
    const row = item({
      key: 'a',
      actions: [action({ type: 'set_details', label: 'Set details', payload: { statementId: 's2' } })],
    });
    const [button] = rowButtons(row);
    expect(button).toMatchObject({ label: 'Set details', variant: 'link', bill: 'set_details' });
    expect(pendingFor(row, button)).toEqual({ type: 'set_details', statementId: 's2' });
  });

  it('review links to its page; a summary row keeps one button', () => {
    const review = item({
      key: 'r',
      kind: 'review',
      rowType: 'summary',
      actions: [nav('review', 'Review', '/transactions/review'), nav('open', 'Open', '/x'), DISMISS],
    });
    expect(rowButtons(review)).toEqual([
      { id: 'review-0', label: 'Review', variant: 'link', href: '/transactions?review=needs_review' },
    ]);
  });

  it('gmail attention reads Assign and goes to the connections page', () => {
    const row = item({ key: 'g', kind: 'gmail_attention', rowType: 'summary', actions: [nav('open', 'Open', '/settings/gmail?focus=attention')] });
    expect(rowButtons(row)[0]).toMatchObject({ label: 'Assign', variant: 'link', href: '/settings/connections' });
  });

  it('a job row reads View and goes to Activity with the job id', () => {
    const failed = item({ key: 'j1', kind: 'job', section: 'needs_look', refs: { jobId: 'job-1' }, actions: [nav('open', 'Open', '/settings/activity')] });
    expect(rowButtons(failed)[0]).toMatchObject({ label: 'View', href: '/settings/activity?job=job-1' });
  });

  it('reward rows read Rewards and go to the account rewards page, else the server href', () => {
    const withAccount = item({ key: 'w', kind: 'reward_milestone', refs: { accountId: 'acc-1' }, actions: [nav('open', 'Open', '/rewards?account=acc-1')] });
    const without = item({ key: 'x', kind: 'reward_cap', actions: [nav('open', 'Open', '/rewards?account=zz')] });
    expect(rowButtons(withAccount)[0]).toMatchObject({ label: 'Rewards', href: '/accounts/acc-1/rewards' });
    expect(rowButtons(without)[0]).toMatchObject({ label: 'Rewards', href: '/rewards?account=zz' });
  });

  it('a row with no actions has no buttons; snooze and dismiss are never buttons', () => {
    expect(rowButtons(item({ key: 'a', kind: 'job', actions: [SNOOZE, DISMISS] }))).toEqual([]);
  });
});

describe('rowButtons, EPF suggestion', () => {
  const epf = (over: Parameters<typeof item>[0]) =>
    item({
      kind: 'epf_match',
      section: 'needs_look',
      refs: { epfEntryId: 'e1', transactionId: 't1' },
      actions: [action({ type: 'epf_link', label: 'Link' }), SNOOZE, action({ type: 'dismiss', label: 'Not this one' })],
      ...over,
    });

  it('shows Not this one then Link, both acting in place rather than navigating', () => {
    expect(rowButtons(epf({ key: 'epf:1' }))).toEqual([
      { id: 'epf_dismiss', label: 'Not this one', variant: 'link', epf: 'dismiss', disabled: false },
      { id: 'epf_link', label: 'Link', variant: 'secondary', epf: 'link', disabled: false },
    ]);
  });

  it('disables both when the suggestion lacks its withdrawal or credit', () => {
    const buttons = rowButtons(epf({ key: 'epf:2', refs: { epfEntryId: 'e1' } }));
    expect(buttons.map((b) => b.disabled)).toEqual([true, true]);
  });

  it('leaves out a button whose action the server did not send', () => {
    expect(rowButtons(epf({ key: 'epf:3', actions: [SNOOZE, DISMISS] })).map((b) => b.epf)).toEqual(['dismiss']);
  });
});

describe('rowButtons, NPS Gmail rows', () => {
  it('a password row links to the NPS tab', () => {
    const row = item({
      key: 'nps_password:p1',
      kind: 'nps_password',
      href: '/investments/retirement/nps',
      refs: { npsPendingId: 'p1' },
      actions: [action({ type: 'nps_password', label: 'Enter password' }), action({ type: 'dismiss', label: 'Dismiss' })],
    });
    expect(rowButtons(row)).toEqual([
      { id: 'nps_password', label: 'Enter password', variant: 'secondary', href: '/investments/retirement/nps' },
    ]);
  });

  it('a new-account row acts in place: Mine and My child\'s inline, Ignore in the menu', () => {
    const row = item({
      key: 'nps_new_account:p2',
      kind: 'nps_new_account',
      refs: { npsPendingId: 'p2' },
      actions: [
        action({ type: 'nps_add_self', label: 'Add as mine' }),
        action({ type: 'nps_add_child', label: "Add as my child's" }),
        action({ type: 'nps_ignore', label: 'Ignore' }),
      ],
    });
    expect(rowButtons(row).map((b) => [b.label, b.nps])).toEqual([
      ['Mine', 'add_self'],
      ["My child's", 'add_child'],
    ]);
    expect(rowMenuActions(row)).toEqual([{ id: 'nps_ignore', label: 'Ignore', nps: 'ignore' }]);
  });

  it('disables the in-place buttons when the row has no pending id', () => {
    const row = item({ key: 'nps_new_account:p3', kind: 'nps_new_account', actions: [action({ type: 'nps_add_self', label: 'Add as mine' })] });
    expect(rowButtons(row)[0].disabled).toBe(true);
  });
});

describe('rowButtons, nps_setup row', () => {
  const row = item({
    key: 'nps_setup',
    kind: 'nps_setup',
    href: '/investments/retirement/nps',
    actions: [
      action({ type: 'open', label: 'Open', href: '/investments/retirement/nps' }),
      action({ type: 'nps_setup_not_nps', label: 'Not NPS' }),
      action({ type: 'dismiss', label: 'Dismiss' }),
    ],
  });
  it('has one inline Set up link and Not NPS in the menu', () => {
    expect(rowButtons(row)).toEqual([{ id: 'nps_setup', label: 'Set up', variant: 'secondary', href: '/investments/retirement/nps' }]);
    expect(rowMenuActions(row)).toEqual([{ id: 'nps_setup_not_nps', label: 'Not NPS', nps: 'setup_not_nps' }]);
  });
});

describe('no_statement is a menu action, not a button', () => {
  const upload = action({ type: 'upload', label: 'Upload', href: '/transactions/import?account=A1' });
  const skip = action({
    type: 'no_statement',
    label: 'No statement this period',
    payload: { accountId: 'A1', date: '2026-10-03' },
  });

  it('leaves only Upload as a button and exposes the skip as a menu action carrying the card and period end', () => {
    const row = item({ key: 'a', kind: 'statement_expected', href: '/transactions/import?account=A1', actions: [upload, SNOOZE, skip] });
    expect(rowButtons(row)).toEqual([
      { id: 'upload-0', label: 'Upload', variant: 'secondary', href: '/transactions/import?account=A1' },
    ]);
    expect(rowMenuActions(row)).toEqual([
      { id: 'no_statement-1', label: 'No statement this period', skip: { accountId: 'A1', periodEnd: '2026-10-03' } },
    ]);
  });

  it('never becomes a link to the row href', () => {
    const row = item({ key: 'a', kind: 'statement_expected', href: '/x', actions: [skip] });
    expect(rowButtons(row)).toEqual([]);
  });

  it('falls back to the row refs and date, and is left out when neither names them', () => {
    const bare = action({ type: 'no_statement', label: 'No statement this period' });
    const withRefs = item({ key: 'a', kind: 'statement_expected', date: '2026-10-03', refs: { accountId: 'A2' }, actions: [bare] });
    expect(rowMenuActions(withRefs)[0]).toMatchObject({ skip: { accountId: 'A2', periodEnd: '2026-10-03' } });
    const none = item({ key: 'b', kind: 'statement_expected', actions: [bare] });
    expect(rowMenuActions(none)).toEqual([]);
  });

  it('a row without the action has no menu actions', () => {
    expect(rowMenuActions(item({ key: 'a', kind: 'job', actions: [SNOOZE, DISMISS] }))).toEqual([]);
  });
});

describe('NPS payment rows', () => {
  const match = item({
    key: 'nps_match:e1:t1',
    kind: 'nps_match',
    refs: { npsEntryId: 'e1', transactionId: 't1' },
    actions: [action({ type: 'nps_link', label: 'Link' }), action({ type: 'nps_dismiss', label: 'Not this one' })],
  });
  const record = item({
    key: 'nps_record:t2',
    kind: 'nps_record',
    refs: { transactionId: 't2' },
    actions: [action({ type: 'nps_record', label: 'Record' }), action({ type: 'nps_not_nps', label: 'Not NPS' })],
  });

  it('a pairing offers Link and Not this one', () => {
    expect(rowButtons(match).map((b) => [b.label, b.nps, b.disabled])).toEqual([
      ['Link', 'link', false],
      ['Not this one', 'dismiss', false],
    ]);
  });

  it('a pairing is disabled without its ids', () => {
    expect(rowButtons({ ...match, refs: {} }).every((b) => b.disabled)).toBe(true);
  });

  it('a debit to record shows Record and Not NPS when Tier II is closed', () => {
    expect(rowButtons(record).map((b) => b.nps)).toEqual(['record', 'not_nps']);
    expect(rowMenuActions(record)).toEqual([]);
  });

  it('Record and the tier buttons wait for the target to load; Not NPS does not', () => {
    expect(rowButtons(record, { npsTargetLoading: true }).map((b) => [b.nps, b.disabled])).toEqual([['record', true], ['not_nps', false]]);
    expect(rowButtons(record, { npsTier2: true, npsTargetLoading: true }).every((b) => b.disabled)).toBe(true);
  });

  it('with Tier II open it shows the two tiers inline and Not NPS in the menu', () => {
    expect(rowButtons(record, { npsTier2: true }).map((b) => [b.label, b.nps])).toEqual([
      ['Tier I', 'record_I'],
      ['Tier II', 'record_II'],
    ]);
    expect(rowMenuActions(record, { npsTier2: true })).toEqual([{ id: 'nps_not_nps', label: 'Not NPS', nps: 'not_nps' }]);
  });
});
