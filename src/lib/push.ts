/**
 * Browser-side Web Push: feature detection, permission, and the subscribe/unsubscribe calls
 * against the service worker registered by Serwist. The server owns the subscription list;
 * these helpers only talk to the browser.
 */

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent: string;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** iOS only delivers Web Push to a Home Screen (standalone) install. */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(ua) || iPadOs;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || (window.matchMedia?.('(display-mode: standalone)').matches ?? false);
}

export type PermissionState = 'default' | 'denied' | 'granted' | 'unsupported';

export function notificationPermission(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** VAPID public key (base64url) → the bytes `PushManager.subscribe` wants. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function toSubscriptionPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('The browser returned an incomplete push subscription');
  }
  return { endpoint: json.endpoint, keys: { p256dh, auth }, userAgent: describeDevice() };
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const ready = await navigator.serviceWorker.ready;
  return ready;
}

/** The subscription this browser already holds, if any. */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await registration();
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Asks for permission (must run from a user gesture) and subscribes this browser.
 * Throws with a readable message when the user declines or the platform cannot.
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscriptionPayload> {
  if (!isPushSupported()) {
    throw new Error('This browser does not support push notifications');
  }
  if (!vapidPublicKey) {
    throw new Error('Push notifications are not configured on the server');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notifications are blocked for this site. Allow them in the browser settings and try again.');
  }
  const reg = await registration();
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    return toSubscriptionPayload(existing);
  }
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    // A fresh Uint8Array always sits on its own ArrayBuffer; the cast only narrows the TS 5.7 type.
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
  });
  return toSubscriptionPayload(subscription);
}

/** Drops this browser's subscription; returns its endpoint so the server copy can be removed too. */
export async function unsubscribeFromPush(): Promise<string | null> {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}

/** A short label for the devices list ("Chrome · Android"), from the user agent. */
export function describeDevice(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): string {
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /CriOS\//.test(ua) || /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser';
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Mac OS X/.test(ua)
        ? 'macOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return os ? `${browser} · ${os}` : browser;
}
