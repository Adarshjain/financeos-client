import { describe, expect, it } from 'vitest';

import { pendingFor, rowButtons } from './inboxRows';
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

  it('a failed job reads View and a finished one Details, both to Activity with the job id', () => {
    const failed = item({ key: 'j1', kind: 'job', section: 'needs_look', refs: { jobId: 'job-1' }, actions: [nav('open', 'Open', '/settings/activity')] });
    const done = item({ key: 'j2', kind: 'job', section: 'info', refs: { jobId: 'job-2' }, actions: [nav('open', 'Open', '/settings/activity')] });
    expect(rowButtons(failed)[0]).toMatchObject({ label: 'View', href: '/settings/activity?job=job-1' });
    expect(rowButtons(done)[0]).toMatchObject({ label: 'Details', href: '/settings/activity?job=job-2' });
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
