'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Wraps the selected statement's detail column. When a statement is picked (address has ?statement=) and the card's top
 * is not visible below the sticky top bar, scrolls it to the top. Layout only: no visual classes besides the scroll margin.
 */
export function ScrollIntoViewOnSelect({
  selectedId,
  fromAddress,
  className,
  children,
}: {
  selectedId: string;
  fromAddress: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!fromAddress || !el) return;
    // The scroll margin is the sticky top bar's height (scroll-mt-sticky-offset), so it is also what counts as hidden.
    const bar = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    const top = el.getBoundingClientRect().top;
    // Already in view: its top is below the bar and in the upper half of the screen (a card peeking in at the bottom
    // still scrolls up).
    if (top >= bar && top <= window.innerHeight / 2) return;
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [selectedId, fromAddress]);

  return (
    <div ref={ref} className={`scroll-mt-sticky-offset${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
