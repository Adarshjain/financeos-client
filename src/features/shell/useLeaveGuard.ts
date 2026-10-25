'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface LeaveGuard {
  /** Where the visitor tried to go, while the page waits for an answer; null otherwise. */
  pendingHref: string | null;
  /** Go to `href`, asking first when the guard is active. For buttons that navigate from code. */
  requestLeave: (href: string) => void;
  /** The answer "leave": goes where the visitor was heading. */
  confirmLeave: () => void;
  /** The answer "stay". */
  cancelLeave: () => void;
}

/** The slice of the Navigation API the guard uses. */
interface NavigateEventLike extends Event {
  navigationType: string;
  cancelable: boolean;
  destination: { url: string; key: string; sameDocument: boolean };
}
interface NavigationLike extends EventTarget {
  currentEntry?: { index: number } | null;
  traverseTo?: (key: string) => unknown;
}

/** The browser's Navigation API, when it has one. */
function navigationApi(): NavigationLike | undefined {
  return (window as unknown as { navigation?: NavigationLike }).navigation;
}

/** Where the current entry sits in the history, when the browser says (Navigation API); null otherwise. */
function entryIndex(): number | null {
  return navigationApi()?.currentEntry?.index ?? null;
}

/** The same-origin address a click on `anchor` would open in this tab, or null when the guard must not step in. */
function internalTarget(anchor: HTMLAnchorElement, event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  if (anchor.target && anchor.target !== '_self') return null;
  if (anchor.hasAttribute('download')) return null;
  const raw = anchor.getAttribute('href');
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  const here = window.location;
  // A hash on this very page, or this very address, goes nowhere: nothing to lose.
  if (url.pathname === here.pathname && url.search === here.search) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Asks before the visitor leaves a page with unsaved work. While `active`:
 * - closing or reloading the tab shows the browser's own prompt (`beforeunload`);
 * - a click on an in-app link is stopped before the router sees it, and `pendingHref` holds where it led;
 * - Back and Forward are stopped before they happen through the Navigation API's cancelable `navigate` event, and
 *   `pendingHref` holds where the visitor was heading. The router applies a `popstate` synchronously (React 19),
 *   unmounting the page before a later listener runs, so `popstate` is only the fallback for browsers without the
 *   API: there the address is put back after the fact.
 * The page shows its own confirmation while `pendingHref` is set and answers with `confirmLeave` / `cancelLeave`.
 * `requestLeave(href)` is the same question for a button that navigates from code.
 *
 * The App Router has no "before navigation" hook, so links are caught by one capturing click listener on the
 * document. A link that opens a new tab, downloads, or points off-site is left alone (the browser prompt covers
 * leaving the site).
 */
export function useLeaveGuard(active: boolean): LeaveGuard {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  // The entry the guard protects: where Back or Forward put the visitor again when the question is answered "stay".
  const protectedHref = useRef<string>('');
  const protectedState = useRef<unknown>(null);
  const protectedIndex = useRef<number | null>(null);
  // How the visitor got to the pending address: stepping Back leaves it one entry behind, so Leave steps back again.
  const pendingFromBack = useRef(false);
  // The history entry a cancelled Back or Forward was heading to (Navigation API): Leave traverses to it.
  const pendingKey = useRef<string | null>(null);
  const bypass = useRef(false);
  // A new question (or an answer) drops how the previous one came about, so Leave never acts on a stale step.
  const forgetStep = useCallback(() => {
    pendingFromBack.current = false;
    pendingKey.current = null;
  }, []);

  useEffect(() => {
    if (!active) return;
    protectedHref.current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    // The page's own history state (the router keeps its bookkeeping in it): restored as it was, never the destination's.
    protectedState.current = window.history.state;
    protectedIndex.current = entryIndex();

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const onClick = (e: MouseEvent) => {
      if (bypass.current) return;
      const anchor = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!anchor) return;
      const target = internalTarget(anchor as HTMLAnchorElement, e);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      forgetStep();
      setPendingHref(target);
    };

    const onNavigate = (event: Event) => {
      const e = event as NavigateEventLike;
      // A step Leave asked for passes; popstate clears the flag once the router has followed it.
      if (bypass.current || e.navigationType !== 'traverse' || !e.cancelable || !e.destination.sameDocument) return;
      // Any step through history leaves this editing session, even to an entry with the same address.
      const url = new URL(e.destination.url);
      const target = `${url.pathname}${url.search}${url.hash}`;
      e.preventDefault();
      forgetStep();
      pendingKey.current = e.destination.key;
      setPendingHref(target);
    };

    const onPopState = (e: PopStateEvent) => {
      if (bypass.current) {
        // The step Leave asked for: let the router follow it.
        bypass.current = false;
        return;
      }
      const here = window.location;
      const target = `${here.pathname}${here.search}${here.hash}`;
      if (target === protectedHref.current) return;
      // The browser has already moved: stop the router following, and put the protected entry back.
      const index = entryIndex();
      forgetStep();
      pendingFromBack.current = index !== null && protectedIndex.current !== null && index < protectedIndex.current;
      e.stopImmediatePropagation();
      window.history.pushState(protectedState.current, '', protectedHref.current);
      setPendingHref(target);
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState, true);
    // Only a full Navigation API can cancel a step; a partial one (or none) leaves it to popstate.
    const navigation = typeof navigationApi()?.addEventListener === 'function' ? navigationApi() : undefined;
    navigation?.addEventListener('navigate', onNavigate);
    return () => {
      navigation?.removeEventListener('navigate', onNavigate);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState, true);
    };
  }, [active, forgetStep]);

  const go = useCallback(
    (href: string) => {
      bypass.current = true;
      router.push(href);
      // The guard stays off for this one navigation; a failed one must not leave the page unguarded for good.
      window.setTimeout(() => {
        bypass.current = false;
      }, 0);
    },
    [router],
  );

  const requestLeave = useCallback(
    (href: string) => {
      forgetStep();
      if (active) setPendingHref(href);
      else go(href);
    },
    [active, go, forgetStep],
  );

  const confirmLeave = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    if (!href) return;
    const key = pendingKey.current;
    const navigation = navigationApi();
    if (key && navigation?.traverseTo) {
      // The cancelled Back or Forward, taken now: the browser moves to the very entry it was heading to.
      forgetStep();
      bypass.current = true;
      const fallBack = () => {
        // The entry is gone (the history changed while the question was open): go by address instead.
        bypass.current = false;
        go(href);
      };
      try {
        const result = navigation.traverseTo(key) as { finished?: Promise<unknown> } | undefined;
        result?.finished?.catch(fallBack);
      } catch {
        fallBack();
        return;
      }
      window.setTimeout(() => {
        bypass.current = false;
      }, 1000);
      return;
    }
    if (pendingFromBack.current) {
      // The entry Back led to sits right behind the one pushed back: step to it, so no extra entry is added.
      pendingFromBack.current = false;
      bypass.current = true;
      window.history.go(-1);
      window.setTimeout(() => {
        bypass.current = false;
      }, 1000);
      return;
    }
    go(href);
  }, [pendingHref, go, forgetStep]);

  const cancelLeave = useCallback(() => {
    forgetStep();
    setPendingHref(null);
  }, [forgetStep]);

  return { pendingHref, requestLeave, confirmLeave, cancelLeave };
}
