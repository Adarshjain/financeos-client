/**
 * The JSON the server puts in a Web Push message and the service worker turns into a
 * notification. Pure and dependency-free so both the worker and the unit tests can use it.
 */
export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

const DEFAULT_TITLE = 'FinanceOS';
const DEFAULT_URL = '/dashboard';

/** Tolerates an empty or malformed push body: the notification still shows something. */
export function parsePushPayload(raw: string | null | undefined): PushPayload {
  if (!raw) return { title: DEFAULT_TITLE };
  try {
    const parsed = JSON.parse(raw) as Partial<PushPayload> | null;
    if (!parsed || typeof parsed !== 'object') return { title: DEFAULT_TITLE, body: raw };
    return {
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title : DEFAULT_TITLE,
      body: typeof parsed.body === 'string' ? parsed.body : undefined,
      url: typeof parsed.url === 'string' ? parsed.url : undefined,
      tag: typeof parsed.tag === 'string' ? parsed.tag : undefined,
    };
  } catch {
    return { title: DEFAULT_TITLE, body: raw };
  }
}

/**
 * Where a tap lands. Only same-origin targets are honoured (a relative path, or an absolute URL
 * on this origin); anything else falls back to the dashboard.
 */
export function resolveNotificationUrl(url: string | undefined, origin: string): string {
  if (!url) return origin + DEFAULT_URL;
  try {
    const resolved = new URL(url, origin);
    if (resolved.origin !== origin) return origin + DEFAULT_URL;
    return resolved.href;
  } catch {
    return origin + DEFAULT_URL;
  }
}
