import { appHref } from '@/features/shell/routes';
import type { Schemas } from '@/lib/api/types';
import { formatDate, formatDateTime } from '@/lib/format';

export type GmailConnection = Schemas['GmailConnectionResponse'];

/** The Connections page's own URL (the Dinero preview route). */
export const CONNECTIONS_HREF = appHref('/settings/connections');
export const ACTIVITY_GMAIL_HREF = appHref('/settings/activity?type=GMAIL_SYNC');

/** What the OAuth callback redirect says about the connection attempt (`?gmail=…`). */
export interface OauthReturn {
  kind: 'success' | 'error';
  email?: string;
  message?: string;
}

export const OAUTH_PARAMS = ['gmail', 'email', 'message'] as const;

export function oauthReturnFrom(params: { gmail?: string; email?: string; message?: string }): OauthReturn | null {
  if (params.gmail === 'success') return { kind: 'success', email: params.email };
  if (params.gmail === 'error') return { kind: 'error', message: params.message };
  return null;
}

/** Looks like a raw HTTP status: "HTTP 500", "status 502", "status code 404", "404 Not Found". A bare amount like "₹500" is not. */
const RAW_HTTP = /\bHTTP\b|\bstatus(?: code)?:?\s*[45]\d\d\b|\b[45]\d\d (?:Bad Request|Unauthorized|Forbidden|Not Found|Conflict|Too Many Requests|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout)\b/i;

/** An error banner reads as one short line: a long or raw HTTP message ("HTTP 500 ...") gives way to the fallback. */
export function shortError(message: string | null | undefined, fallback: string): string {
  const text = (message ?? '').trim();
  if (!text || text.length > 90 || RAW_HTTP.test(text) || text.includes('\n')) return fallback;
  return text;
}

export const OAUTH_ERROR_FALLBACK = "Couldn't connect Gmail. Try again.";

/** "Connected 15 Jun · last sync 16 Jun, 3:30 pm"; either half is left out when the date is unknown. */
export function mailboxStatusLine(conn: GmailConnection): string {
  const parts: string[] = [];
  if (conn.connectedAt) parts.push(`Connected ${formatDate(conn.connectedAt, 'list')}`);
  if (conn.lastSyncedAt) parts.push(`last sync ${formatDateTime(conn.lastSyncedAt)}`);
  return parts.join(' · ');
}

export function authFailedLine(conn: GmailConnection): string | null {
  if (!conn.needsReconnect || !conn.authFailedAt) return null;
  return `Google stopped accepting this mailbox on ${formatDate(conn.authFailedAt, 'full')}. Imports are paused until you reconnect.`;
}

export function senderTitle(sender: { name?: string | null }): string {
  return sender.name || '(Unnamed sender)';
}
