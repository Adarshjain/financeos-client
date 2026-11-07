import { describe, expect, it } from 'vitest';

import { pinClock } from '@/test/pinClock';

import { authFailedLine, type GmailConnection, mailboxStatusLine, oauthReturnFrom, senderTitle, shortError } from './connectionsModel';

pinClock();

const conn = (over: Partial<GmailConnection> = {}) =>
  ({ id: 'c1', email: 'a@b.test', isPrimary: true, needsReconnect: false, ...over }) as GmailConnection;

describe('connectionsModel', () => {
  it('reads the OAuth return params', () => {
    expect(oauthReturnFrom({ gmail: 'success', email: 'a@b.test' })).toEqual({ kind: 'success', email: 'a@b.test' });
    expect(oauthReturnFrom({ gmail: 'error', message: 'denied' })).toEqual({ kind: 'error', message: 'denied' });
    expect(oauthReturnFrom({})).toBeNull();
    expect(oauthReturnFrom({ gmail: 'other' })).toBeNull();
  });

  it('builds the status line from whatever dates are known', () => {
    expect(mailboxStatusLine(conn({ connectedAt: '2026-06-15T10:00:00Z' }))).toBe('Connected 15 Jun');
    expect(mailboxStatusLine(conn({ connectedAt: '2026-06-15T10:00:00Z', lastSyncedAt: '2026-06-16T10:00:00Z' }))).toBe(
      'Connected 15 Jun · last sync 16 Jun, 3:30 pm',
    );
    expect(mailboxStatusLine(conn())).toBe('');
  });

  it('words the auth failure only for a mailbox that needs reconnect', () => {
    expect(authFailedLine(conn({ needsReconnect: true, authFailedAt: '2026-10-13T08:00:00Z' }))).toBe(
      'Google stopped accepting this mailbox on 13 Oct 26. Imports are paused until you reconnect.',
    );
    expect(authFailedLine(conn({ authFailedAt: '2026-10-13T08:00:00Z' }))).toBeNull();
    expect(authFailedLine(conn({ needsReconnect: true }))).toBeNull();
  });

  it('titles an unnamed sender', () => {
    expect(senderTitle({ name: 'HDFC' })).toBe('HDFC');
    expect(senderTitle({ name: null })).toBe('(Unnamed sender)');
  });
});

describe('shortError', () => {
  it('keeps a short plain message', () => {
    expect(shortError('Mailbox already connected.', 'fallback')).toBe('Mailbox already connected.');
  });
  it('keeps a message that only contains a number like an amount', () => {
    expect(shortError('Could not fetch ₹500 of mail quota.', 'fallback')).toBe('Could not fetch ₹500 of mail quota.');
    expect(shortError('Mailbox 404 is already connected.', 'fallback')).toBe('Mailbox 404 is already connected.');
  });
  it('falls back for raw HTTP text, a long message or none', () => {
    expect(shortError('HTTP 500 Internal Server Error at /api/gmail', 'fallback')).toBe('fallback');
    expect(shortError('Request failed with status code 503', 'fallback')).toBe('fallback');
    expect(shortError('Google said 403 Forbidden', 'fallback')).toBe('fallback');
    expect(shortError('x'.repeat(100), 'fallback')).toBe('fallback');
    expect(shortError(null, 'fallback')).toBe('fallback');
  });
});
