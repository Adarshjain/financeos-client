'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Scroll this far in one direction before the bar moves, so a jittery finger does not flicker it. */
const TOLERANCE = 8;

/**
 * True while the page scrolls down (the floating tab bar slides off screen); false again on any scroll up,
 * near the top, and on every route change.
 */
export function useHideOnScroll(): boolean {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // A new page starts with the bar showing.
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setHidden(false);
  }

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      // Clamp the iOS rubber band at both ends so its bounce never reads as a direction change.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = Math.min(Math.max(window.scrollY, 0), Math.max(max, 0));
      if (y <= TOLERANCE) {
        setHidden(false);
        last = y;
        return;
      }
      const delta = y - last;
      if (Math.abs(delta) < TOLERANCE) return;
      setHidden(delta > 0);
      last = y;
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return hidden;
}
