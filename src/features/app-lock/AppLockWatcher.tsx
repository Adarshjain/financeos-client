'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { APP_LOCK_CHANGED_EVENT, APP_LOCKED_EVENT, isLockRoute, lockHref } from '@/lib/appLock';

const STATUS_URL = '/api/v1/app-lock/status';
const HEARTBEAT_URL = '/api/v1/app-lock/heartbeat';
const LOCK_URL = '/api/v1/app-lock/lock';

/** Pages with no session: there is nothing to lock, so no status request. */
const SESSIONLESS = /^\/(ds\/)?(login|signup|offline)(\/|$)/;

/** Ignore leaving the page this soon after arriving, so a beacon never follows straight after an unlock. */
const BEACON_GRACE_MS = 3000;

interface Status {
  armed: boolean;
  locked: boolean;
  lockAfterSeconds?: number | null;
  heartbeatSeconds: number;
}

function goToLock(): void {
  // Already on the lock screen (a stale request answered late): reloading it would drop `from`.
  if (isLockRoute(window.location.pathname)) return;
  window.location.replace(lockHref(window.location.pathname + window.location.search));
}

/**
 * Keeps an app-locked session honest and sends the browser to the lock screen when the server says locked.
 * Non-visual; mounted once in the shared providers so /ds and Legacy both get it. With app lock off it makes one
 * status request per page load or return to the tab and nothing else: no heartbeat.
 * Only the heartbeat counts as activity, and only while the tab is visible and focused.
 */
export function AppLockWatcher(): null {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  // Set by the mount effect: re-reads the page gate after a soft navigation (sign-in, sign-up, leaving the lock screen).
  const pathChanged = useRef<() => void>(() => undefined);

  useEffect(() => {
    pathRef.current = pathname;
    pathChanged.current();
  }, [pathname]);

  useEffect(() => {
    // Providers outlive soft navigations, so the listeners are always on; only the requests depend on the page.
    const gated = () => {
      const here = pathRef.current ?? window.location.pathname;
      return isLockRoute(here) || SESSIONLESS.test(here);
    };
    const mountedAt = Date.now();
    let status: Status | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let disposed = false;

    const active = () => document.visibilityState === 'visible' && document.hasFocus();

    const stopHeartbeat = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };

    const heartbeat = async () => {
      if (gated() || !status?.armed || !active()) return;
      try {
        const res = await fetch(HEARTBEAT_URL, { method: 'POST', keepalive: true, credentials: 'same-origin' });
        if (res.status === 423 && !disposed) goToLock();
      } catch {
        // Offline or a blip: the next beat tries again.
      }
    };

    const syncHeartbeat = () => {
      stopHeartbeat();
      if (gated() || !status?.armed || status.locked || !active()) return;
      void heartbeat();
      timer = setInterval(() => void heartbeat(), status.heartbeatSeconds * 1000);
    };

    const refresh = async () => {
      if (gated()) {
        status = null;
        stopHeartbeat();
        return;
      }
      try {
        const res = await fetch(STATUS_URL, { credentials: 'same-origin', cache: 'no-store' });
        if (disposed) return;
        if (res.status === 423) return goToLock();
        if (!res.ok) {
          status = null;
          stopHeartbeat();
          return;
        }
        status = (await res.json()) as Status;
        if (disposed) return;
        if (status.armed && status.locked) return goToLock();
        syncHeartbeat();
      } catch {
        // Unreachable server: leave things as they are.
      }
    };

    const leave = () => {
      if (gated() || !status?.armed || status.lockAfterSeconds !== 0) return;
      if (Date.now() - mountedAt < BEACON_GRACE_MS) return;
      navigator.sendBeacon(LOCK_URL);
    };

    pathChanged.current = () => {
      if (gated()) {
        status = null;
        stopHeartbeat();
      } else if (!status) {
        void refresh();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        leave();
        stopHeartbeat();
      } else {
        void refresh();
      }
    };
    const onPageHide = () => leave();
    const onFocus = () => syncHeartbeat();
    const onBlur = () => stopHeartbeat();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    window.addEventListener(APP_LOCKED_EVENT, goToLock);
    window.addEventListener(APP_LOCK_CHANGED_EVENT, refresh);
    void refresh();

    return () => {
      disposed = true;
      pathChanged.current = () => undefined;
      stopHeartbeat();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener(APP_LOCKED_EVENT, goToLock);
      window.removeEventListener(APP_LOCK_CHANGED_EVENT, refresh);
    };
  }, []);

  return null;
}
