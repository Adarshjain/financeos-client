import { describe, expect, it } from 'vitest';

import {
  type AttentionItem,
  describeAttentionItem,
  formatDateTime,
  gmailMessageUrl,
} from '../attentionItem.helpers';

function item(overrides: Partial<AttentionItem>): AttentionItem {
  return {
    id: 'ledger-1',
    gmailMessageId: '18c2f0a1b2c3d4e5',
    status: 'FAILED_PERMANENT',
    attemptCount: 3,
    discoveredAt: '2026-10-01T04:30:00Z',
    connectionEmail: 'me@gmail.com',
    ...overrides,
  } as AttentionItem;
}

describe('describeAttentionItem', () => {
  it('unresolved account with a card number names it and suggests assigning', () => {
    const d = describeAttentionItem(item({ status: 'UNRESOLVED_ACCOUNT', extractedLast4: '1234' }));
    expect(d.label).toBe('No matching account');
    expect(d.summary).toContain('••1234');
    expect(d.hint).toMatch(/Assign/);
  });

  it('unresolved account without a card number says the email named none', () => {
    const d = describeAttentionItem(item({ status: 'UNRESOLVED_ACCOUNT', extractedLast4: null }));
    expect(d.summary).toMatch(/did not name an account or card number/);
    expect(d.hint).not.toMatch(/Assign/);
  });

  it('not opted in names the matched account', () => {
    const d = describeAttentionItem(
      item({ status: 'ACCOUNT_NOT_OPTED_IN', accountName: 'HSBC Live+', extractedLast4: '9876' })
    );
    expect(d.label).toBe('Gmail import off');
    expect(d.summary).toBe('Matched HSBC Live+, but Gmail import is not turned on for it.');
    expect(d.hint).toMatch(/Ingest From Date/);
  });

  it('not opted in without an account name falls back to the card number', () => {
    const d = describeAttentionItem(item({ status: 'ACCOUNT_NOT_OPTED_IN', accountName: null, extractedLast4: '9876' }));
    expect(d.summary).toContain('the account ending ••9876');
  });

  it('not opted in with neither name nor number still reads', () => {
    const d = describeAttentionItem(item({ status: 'ACCOUNT_NOT_OPTED_IN', accountName: null, extractedLast4: null }));
    expect(d.summary).toBe('Matched an account, but Gmail import is not turned on for it.');
  });

  it.each([
    'Extraction failed: No active LLM API keys configured. Add an API key in Settings.',
    'needs attention: add an API key in Settings',
  ])('missing AI key errors point at AI keys settings (%s)', (error) => {
    const d = describeAttentionItem(item({ error }));
    expect(d.label).toBe('No AI key');
    expect(d.hint).toMatch(/AI keys & routing/);
  });

  it('an undecryptable statement points at the statement password', () => {
    const d = describeAttentionItem(item({ error: 'Encrypted statement could not be decrypted with any stored password.' }));
    expect(d.label).toBe('Locked statement');
    expect(d.hint).toMatch(/Statement Password/);
  });

  it('a statement parse failure suggests a manual upload', () => {
    const d = describeAttentionItem(item({ error: 'Statement parse failed: no table found' }));
    expect(d.label).toBe('Statement unreadable');
    expect(d.hint).toMatch(/upload the statement/);
  });

  it('any other extraction failure says the AI could not read it', () => {
    const d = describeAttentionItem(item({ error: 'Extraction failed: model returned invalid JSON' }));
    expect(d.label).toBe('Could not read email');
  });

  it('an unknown error reports the attempt count', () => {
    expect(describeAttentionItem(item({ error: 'boom', attemptCount: 3 })).summary).toBe(
      'Processing failed after 3 attempts.'
    );
    expect(describeAttentionItem(item({ error: null, attemptCount: 1 })).summary).toBe(
      'Processing failed after 1 attempt.'
    );
  });
});

describe('formatDateTime', () => {
  it('renders a dash for a missing or invalid instant', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('not-a-date')).toBe('—');
  });

  it('renders date and time for an instant', () => {
    const out = formatDateTime('2026-10-01T04:30:00Z');
    expect(out).toMatch(/Oct/);
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('gmailMessageUrl', () => {
  it('opens the message in the mailbox it came from', () => {
    expect(gmailMessageUrl(item({ connectionEmail: 'me+bank@gmail.com', gmailMessageId: '18c2f0a1b2c3d4e5' }))).toBe(
      'https://mail.google.com/mail/?authuser=me%2Bbank%40gmail.com#all/18c2f0a1b2c3d4e5'
    );
  });
});
