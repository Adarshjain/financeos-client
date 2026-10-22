'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';

import { ProgressBar } from '@/components/ds';

import {
  endNavigation,
  showNavigation,
  startNavigation,
  useNavigationShowing,
} from './navigationStore';

/** A navigation faster than this never shows the bar, so instant page changes do not flash. */
export const NAVIGATION_PROGRESS_DELAY_MS = 120;
/** Gives up on a navigation that never commits (cancelled, redirected back) so the bar cannot stick. */
export const NAVIGATION_PROGRESS_TIMEOUT_MS = 8000;

/** The in-app URL a plain left click on a live link is heading to (it may equal the current URL), or null. */
function targetOf(event: MouseEvent): URL | null {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  const anchor = (event.target as Element | null)?.closest?.('a');
  if (!anchor || !anchor.hasAttribute('href') || anchor.hasAttribute('download')) return null;
  if (anchor.hasAttribute('data-disabled') || anchor.getAttribute('aria-disabled') === 'true') {
    return null;
  }
  const targetAttr = anchor.getAttribute('target');
  if (targetAttr && targetAttr !== '_self') return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  return url;
}

/**
 * A thin indeterminate bar at the top of the content column, from the moment an in-app link to a
 * different URL is clicked until the new route commits. Mount once in the app layout, inside Suspense
 * (it reads useSearchParams).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const showing = useNavigationShowing();

  useEffect(() => {
    let delay: number | undefined;
    let giveUp: number | undefined;
    const clear = () => {
      window.clearTimeout(delay);
      window.clearTimeout(giveUp);
    };
    const onClick = (event: MouseEvent) => {
      const url = targetOf(event);
      if (!url) return;
      clear();
      // Back to the page we are on: the pending navigation is abandoned, nothing new starts.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        endNavigation();
        return;
      }
      startNavigation(url.pathname);
      delay = window.setTimeout(showNavigation, NAVIGATION_PROGRESS_DELAY_MS);
      giveUp = window.setTimeout(endNavigation, NAVIGATION_PROGRESS_TIMEOUT_MS);
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      clear();
    };
  }, []);

  // The route committed (link, back or forward): the new URL is in place, so the bar goes.
  useEffect(() => {
    endNavigation();
  }, [pathname, search]);

  if (!showing) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-floating pointer-events-none">
      <ProgressBar aria-label="Loading page" />
    </div>
  );
}
