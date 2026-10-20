import { dayMonth, dayMonthYear } from '@/features/jobs/format';
import type { Schemas } from '@/lib/api/types';
import { formatRelativeTime } from '@/lib/utils';

export type GmailConnection = Schemas['GmailConnectionResponse'];

/** The Connections page's own URL (the Dinero preview route). */
export const CONNECTIONS_HREF = '/ds/settings/connections';
export const ACTIVITY_GMAIL_HREF = '/ds/settings/activity?type=GMAIL_SYNC';

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

export const OAUTH_ERROR_FALLBACK = 'An unexpected error occurred during Google authorization.';

/** "Connected 15 Jun · last sync 4 minutes ago"; either half is left out when the date is unknown. */
export function mailboxStatusLine(conn: GmailConnection): string {
  const parts: string[] = [];
  if (conn.connectedAt) parts.push(`Connected ${dayMonth(conn.connectedAt)}`);
  if (conn.lastSyncedAt) parts.push(`last sync ${formatRelativeTime(conn.lastSyncedAt)}`);
  return parts.join(' · ');
}

export function authFailedLine(conn: GmailConnection): string | null {
  if (!conn.needsReconnect || !conn.authFailedAt) return null;
  return `Google stopped accepting this mailbox on ${dayMonthYear(conn.authFailedAt)}. Imports are paused until you reconnect.`;
}

export function senderTitle(sender: { name?: string | null }): string {
  return sender.name || '(Unnamed sender)';
}
