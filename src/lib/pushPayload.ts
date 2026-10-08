/**
 * The JSON the server puts in a Web Push message and the service worker turns into a
 * notification. Pure and dependency-free so both the worker and the unit tests can use it.
 */
export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  /** Stay silent while a FinanceOS window is in the foreground (the page already shows the outcome). */
  quietWhenVisible?: boolean;
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
      ...(parsed.quietWhenVisible === true ? { quietWhenVisible: true } : {}),
    };
  } catch {
    return { title: DEFAULT_TITLE, body: raw };
  }
}

/** The shape of a window client as far as the quiet rule cares. */
export interface VisibleClientLike {
  visibilityState?: string;
  focused?: boolean;
}

/**
 * Whether a push marked `quietWhenVisible` should be swallowed: only when some FinanceOS window
 * is both visible and focused, i.e. the user is looking at the app right now.
 */
export function shouldStayQuiet(payload: PushPayload, clients: readonly VisibleClientLike[]): boolean {
  if (!payload.quietWhenVisible) return false;
  return clients.some((c) => c.visibilityState === 'visible' && c.focused === true);
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
