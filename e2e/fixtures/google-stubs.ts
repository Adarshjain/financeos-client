/**
 * Google, played by WireMock.
 *
 * The static consent screen (`stubs/wiremock/mappings/google-consent.json`) immediately 302s back to
 * whatever `redirect_uri` it was given with `code=e2e-code-<state>`. Everything that needs an identity
 * (token exchange, refresh, userinfo, Gmail profile, mailbox) is registered per test through the
 * WireMock admin API and keyed by a unique access token, so parallel workers never see each other's
 * mailboxes. Remove what you registered in `afterAll` via `cleanupIdentity`.
 */
import { E2E_API_URL, E2E_CLIENT_URL, E2E_WIREMOCK_URL } from './config';

const ADMIN = `${E2E_WIREMOCK_URL}/__admin`;
const runId = process.env.E2E_RUN_ID ?? Date.now().toString(36);
let identityCounter = 0;

export const SSO_REDIRECT_PORT = Number(new URL(E2E_CLIENT_URL).port);
export const GMAIL_REDIRECT_PORT = Number(new URL(E2E_API_URL).port);
export const GMAIL_API_PREFIX = '/gmail/gmail/v1/users/me';

export interface GoogleIdentity {
  id: string;
  email: string;
  sub: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  /** Exact authorization codes this identity answers (API-level flows pass one of these). */
  codes: string[];
  mappingIds: string[];
}

export interface RegisterIdentityOptions {
  email?: string;
  sub?: string;
  name?: string;
  /** How many exact authorization codes to mint (default 3). */
  codeCount?: number;
  /** Also answer any browser-minted code whose redirect_uri is the client SSO callback (port 6970). */
  browserSso?: boolean;
  /** Also answer any browser-minted code whose redirect_uri is the server Gmail callback (port 6969). */
  browserGmail?: boolean;
  /** Leave the refresh token out of the code exchange (SSO that must not create a Gmail connection). */
  withoutRefreshToken?: boolean;
  /** Make the code exchange fail with this HTTP status (error paths). */
  tokenStatus?: number;
}

export interface MailAttachment {
  filename: string;
  mimeType: string;
  data: Buffer;
}

export interface MailMessage {
  /** Gmail message id — unique per test run (use `mailId()`). */
  id: string;
  from: string;
  subject: string;
  /** Sent time; must fall inside the first-backfill window (last 30 days) to be realistic. */
  sentAt: Date;
  text: string;
  attachments?: MailAttachment[];
}

export interface Mailbox {
  mappingIds: string[];
  messages: MailMessage[];
}

interface WireMockRequestPattern {
  method?: string;
  urlPath?: string;
  urlPathPattern?: string;
  headers?: Record<string, Record<string, string>>;
  bodyPatterns?: Record<string, string>[];
}

// ---------------------------------------------------------------------------
// Admin API primitives
// ---------------------------------------------------------------------------

async function admin(method: string, path: string, body?: unknown): Promise<Response> {
  const res = await fetch(`${ADMIN}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`WireMock admin ${method} ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res;
}

export async function addMapping(mapping: Record<string, unknown>): Promise<string> {
  const res = await admin('POST', '/mappings', mapping);
  const json = (await res.json()) as { id: string };
  return json.id;
}

export async function removeMappings(ids: string[]): Promise<void> {
  for (const id of ids) {
    const res = await fetch(`${ADMIN}/mappings/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      throw new Error(`WireMock DELETE mapping ${id} failed: ${res.status}`);
    }
  }
}

/** Requests WireMock could not match to any stub. The suite treats anything above 0 as a bug. */
export async function unmatchedCount(): Promise<number> {
  const res = await admin('GET', '/requests/unmatched');
  const json = (await res.json()) as { requests: unknown[] };
  return json.requests.length;
}

export async function requestCount(pattern: WireMockRequestPattern): Promise<number> {
  const res = await admin('POST', '/requests/count', pattern);
  const json = (await res.json()) as { count: number };
  return json.count;
}

export interface LoggedRequest {
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
}

export async function findRequests(pattern: WireMockRequestPattern): Promise<LoggedRequest[]> {
  const res = await admin('POST', '/requests/find', pattern);
  const json = (await res.json()) as { requests: LoggedRequest[] };
  return json.requests;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function bearer(identity: { accessToken: string }): Record<string, Record<string, string>> {
  return { Authorization: { equalTo: `Bearer ${identity.accessToken}` } };
}

// ---------------------------------------------------------------------------
// Identities
// ---------------------------------------------------------------------------

export async function registerIdentity(opts: RegisterIdentityOptions = {}): Promise<GoogleIdentity> {
  identityCounter += 1;
  const id = `${runId}-${identityCounter}-${Math.random().toString(36).slice(2, 7)}`;
  const identity: GoogleIdentity = {
    id,
    email: opts.email ?? `google-${id}@example.test`,
    sub: opts.sub ?? `sub-${id}`,
    name: opts.name ?? `Google User ${id}`,
    accessToken: `AT-${id}`,
    refreshToken: `RT-${id}`,
    codes: Array.from({ length: opts.codeCount ?? 3 }, (_, i) => `e2e-code-${id}-${i + 1}`),
    mappingIds: [],
  };

  const scope = 'openid email profile https://www.googleapis.com/auth/gmail.readonly';
  const tokenBody: Record<string, unknown> = {
    access_token: identity.accessToken,
    expires_in: 3600,
    token_type: 'Bearer',
    id_token: `id-token-${id}`,
    scope,
  };
  if (!opts.withoutRefreshToken) {
    tokenBody.refresh_token = identity.refreshToken;
  }
  const tokenResponse =
    opts.tokenStatus && opts.tokenStatus !== 200
      ? {
          status: opts.tokenStatus,
          headers: JSON_HEADERS,
          jsonBody: { error: 'invalid_grant', error_description: 'e2e scripted token failure' },
        }
      : { status: 200, headers: JSON_HEADERS, jsonBody: tokenBody };

  // (a) authorization-code exchange — exact codes (priority 1 beats any browser-generic stub)
  for (const code of identity.codes) {
    identity.mappingIds.push(
      await addMapping({
        name: `token-exact-${code}`,
        priority: 1,
        request: {
          method: 'POST',
          urlPath: '/google/oauth2/token',
          bodyPatterns: [{ matches: `(?s)(.*&)?code=${escapeRegex(code)}(&.*)?` }],
        },
        response: tokenResponse,
      })
    );
  }
  // (a') browser-minted codes: the consent stub embeds the server's state in the code, so the only
  // stable discriminator is the redirect_uri (client SSO page vs server Gmail callback). Tests that
  // drive a real browser through consent run serially per flow and remove these stubs afterwards.
  for (const [flag, port] of [
    [opts.browserSso, SSO_REDIRECT_PORT],
    [opts.browserGmail, GMAIL_REDIRECT_PORT],
  ] as [boolean | undefined, number][]) {
    if (!flag) continue;
    identity.mappingIds.push(
      await addMapping({
        name: `token-browser-${port}-${id}`,
        priority: 5,
        request: {
          method: 'POST',
          urlPath: '/google/oauth2/token',
          bodyPatterns: [
            { contains: 'code=e2e-code-' },
            { matches: `(?s).*redirect_uri=http(%3A|:)(%2F%2F|//)localhost(%3A|:)${port}.*` },
          ],
        },
        response: tokenResponse,
      })
    );
  }
  // (b) refresh-token grant (the Gmail client library refreshes before every API session)
  identity.mappingIds.push(
    await addMapping({
      name: `token-refresh-${id}`,
      priority: 1,
      request: {
        method: 'POST',
        urlPath: '/google/oauth2/token',
        bodyPatterns: [
          { contains: 'grant_type=refresh_token' },
          { contains: `refresh_token=${identity.refreshToken}` },
        ],
      },
      response: {
        status: 200,
        headers: JSON_HEADERS,
        jsonBody: { access_token: identity.accessToken, expires_in: 3600, token_type: 'Bearer', scope },
      },
    })
  );
  // (c) userinfo (SSO)
  identity.mappingIds.push(
    await addMapping({
      name: `userinfo-${id}`,
      priority: 1,
      request: { method: 'GET', urlPath: '/google/oauth2/v2/userinfo', headers: bearer(identity) },
      response: {
        status: 200,
        headers: JSON_HEADERS,
        jsonBody: {
          id: identity.sub,
          email: identity.email,
          name: identity.name,
          picture: `https://example.test/${id}.png`,
          verified_email: true,
        },
      },
    })
  );
  // (d) Gmail profile (connect flow reads the mailbox address from it)
  identity.mappingIds.push(
    await addMapping({
      name: `gmail-profile-${id}`,
      priority: 1,
      request: { method: 'GET', urlPath: `${GMAIL_API_PREFIX}/profile`, headers: bearer(identity) },
      response: {
        status: 200,
        headers: JSON_HEADERS,
        jsonBody: { emailAddress: identity.email, messagesTotal: 0, threadsTotal: 0, historyId: '1' },
      },
    })
  );
  return identity;
}

export async function cleanupIdentity(identity: GoogleIdentity | undefined): Promise<void> {
  if (!identity) return;
  await removeMappings(identity.mappingIds);
  identity.mappingIds = [];
}

// ---------------------------------------------------------------------------
// Mailboxes
// ---------------------------------------------------------------------------

let mailCounter = 0;
export function mailId(label = 'msg'): string {
  mailCounter += 1;
  return `${label}-${runId}-${mailCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function toGmailMessage(identity: GoogleIdentity, m: MailMessage): Record<string, unknown> {
  const text = Buffer.from(m.text, 'utf8');
  const parts: Record<string, unknown>[] = [
    {
      partId: '0',
      mimeType: 'text/plain',
      filename: '',
      headers: [{ name: 'Content-Type', value: 'text/plain; charset="UTF-8"' }],
      body: { size: text.length, data: base64url(text) },
    },
  ];
  (m.attachments ?? []).forEach((att, i) => {
    parts.push({
      partId: String(i + 1),
      mimeType: att.mimeType,
      filename: att.filename,
      headers: [
        { name: 'Content-Type', value: `${att.mimeType}; name="${att.filename}"` },
        { name: 'Content-Disposition', value: `attachment; filename="${att.filename}"` },
      ],
      body: { attachmentId: attachmentId(m, i), size: att.data.length },
    });
  });
  return {
    id: m.id,
    threadId: m.id,
    labelIds: ['INBOX'],
    snippet: m.text.slice(0, 100),
    historyId: '1',
    internalDate: String(m.sentAt.getTime()),
    sizeEstimate: text.length + (m.attachments ?? []).reduce((n, a) => n + a.data.length, 0),
    payload: {
      partId: '',
      mimeType: 'multipart/mixed',
      filename: '',
      headers: [
        { name: 'From', value: m.from },
        { name: 'To', value: identity.email },
        { name: 'Subject', value: m.subject },
        { name: 'Date', value: m.sentAt.toUTCString() },
      ],
      body: { size: 0 },
      parts,
    },
  };
}

function attachmentId(m: MailMessage, index: number): string {
  return `att-${m.id}-${index}`;
}

/**
 * Registers a mailbox for this identity: `messages.list` (any `q`) returns every message given, each
 * message is served in `format=full`, and every attachment is served through `attachments.get`.
 * Call again with a new list to "receive" more mail — remove the previous mailbox first with
 * `removeMappings(mailbox.mappingIds)` so the two list stubs do not compete.
 */
export async function registerMailbox(identity: GoogleIdentity, messages: MailMessage[]): Promise<Mailbox> {
  const mailbox: Mailbox = { mappingIds: [], messages };
  const listBody: Record<string, unknown> = { resultSizeEstimate: messages.length };
  if (messages.length > 0) {
    listBody.messages = messages.map((m) => ({ id: m.id, threadId: m.id }));
  }
  mailbox.mappingIds.push(
    await addMapping({
      name: `gmail-list-${identity.id}`,
      priority: 1,
      request: { method: 'GET', urlPath: `${GMAIL_API_PREFIX}/messages`, headers: bearer(identity) },
      response: { status: 200, headers: JSON_HEADERS, jsonBody: listBody },
    })
  );
  for (const m of messages) {
    mailbox.mappingIds.push(
      await addMapping({
        name: `gmail-get-${m.id}`,
        priority: 1,
        request: { method: 'GET', urlPath: `${GMAIL_API_PREFIX}/messages/${m.id}`, headers: bearer(identity) },
        response: { status: 200, headers: JSON_HEADERS, jsonBody: toGmailMessage(identity, m) },
      })
    );
    for (const [i, att] of (m.attachments ?? []).entries()) {
      mailbox.mappingIds.push(
        await addMapping({
          name: `gmail-att-${m.id}-${i}`,
          priority: 1,
          request: {
            method: 'GET',
            urlPath: `${GMAIL_API_PREFIX}/messages/${m.id}/attachments/${attachmentId(m, i)}`,
            headers: bearer(identity),
          },
          response: {
            status: 200,
            headers: JSON_HEADERS,
            jsonBody: { attachmentId: attachmentId(m, i), size: att.data.length, data: base64url(att.data) },
          },
        })
      );
    }
  }
  identity.mappingIds.push(...mailbox.mappingIds);
  return mailbox;
}

/** The `q` of every `messages.list` call made with this identity's token, oldest first. */
export async function listQueries(identity: GoogleIdentity): Promise<string[]> {
  const requests = await findRequests({
    method: 'GET',
    urlPath: `${GMAIL_API_PREFIX}/messages`,
    headers: bearer(identity),
  });
  return requests.map((r) => new URL(`http://wiremock${r.url}`).searchParams.get('q') ?? '');
}

export async function messagesListCount(identity: GoogleIdentity): Promise<number> {
  return requestCount({ method: 'GET', urlPath: `${GMAIL_API_PREFIX}/messages`, headers: bearer(identity) });
}

export async function revokeCount(identity: GoogleIdentity): Promise<number> {
  return requestCount({
    method: 'POST',
    urlPath: '/google/oauth2/revoke',
    bodyPatterns: [{ contains: `token=${identity.refreshToken}` }],
  });
}
