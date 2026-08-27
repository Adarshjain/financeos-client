/**
 * Generic browser (Web Notification) helpers, reusable by any feature.
 *
 * Typical usage: call `ensureNotificationPermission()` from a user gesture
 * (button click, form submit), then `notifyWhenAway(...)` when the work
 * finishes — it only shows a notification if the user is not currently
 * looking at the page. Use `showBrowserNotification(...)` to skip the
 * visibility check and notify unconditionally (permission still required).
 */

export interface BrowserNotificationOptions {
  title: string;
  body?: string;
  /** Notifications with the same tag replace each other instead of stacking. */
  tag?: string;
  icon?: string;
  /** Runs on click, after the window is focused. */
  onClick?: () => void;
}

const DEFAULT_ICON = '/favicon.ico';
const DEFAULT_BODY_MAX_LENGTH = 140;

/** True when the user is currently looking at this page. */
export function isPageVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible' && document.hasFocus();
}

/** Strip markdown syntax so a notification body reads as plain text. */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ') // code blocks
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links / images
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/[*_~]/g, '') // emphasis
    .replace(/^\s*[-|>]+\s*/gm, '') // list/table/quote markers
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncate text to a notification-sized preview with a trailing ellipsis. */
export function truncateForNotification(
  text: string,
  maxLength: number = DEFAULT_BODY_MAX_LENGTH,
): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Ask for notification permission if it hasn't been decided yet. Call from a
 * user gesture so browsers honor the prompt.
 */
export function ensureNotificationPermission(): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    // Fire and forget; the user's choice applies to later notifications.
    try {
      void Notification.requestPermission();
    } catch {
      // Older browsers only support the callback form.
      try {
        Notification.requestPermission(() => undefined);
      } catch {
        /* notifications unavailable */
      }
    }
  }
}

/**
 * Show a browser notification if permission is granted. Clicking it focuses
 * the window, then runs `onClick` if provided. Silently no-ops where
 * notifications are unsupported or page-created notifications are disallowed
 * (e.g. Android Chrome without a service worker).
 */
export function showBrowserNotification(
  options: BrowserNotificationOptions,
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      tag: options.tag,
      icon: options.icon ?? DEFAULT_ICON,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
      options.onClick?.();
    };
  } catch {
    /* no fallback without a service worker */
  }
}

/**
 * Show a browser notification only when the user is not currently looking at
 * the page (tab hidden or window unfocused).
 */
export function notifyWhenAway(options: BrowserNotificationOptions): void {
  if (isPageVisible()) return;
  showBrowserNotification(options);
}
