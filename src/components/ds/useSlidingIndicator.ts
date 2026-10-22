'use client';

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface IndicatorRect {
  left: number;
  width: number;
}

/**
 * Measures the element matching `selector` inside `containerRef` (offsetLeft/offsetWidth, so
 * container scroll is respected) and re-measures when the active item changes (attribute mutations),
 * on resize (ResizeObserver, skipped where it is missing) and on every render.
 * `rect` is null on the server, first paint and while the item has no width (hidden): the caller keeps its per-item styling until it is set.
 * `animated` is true only after the active item changed; a re-measure of the same item (resize, font swap, label change) snaps, so the indicator never lags its item.
 * Item elements are observed too, so a size change that leaves the container alone is caught, and the measure reruns when fonts finish loading.
 */
export function useSlidingIndicator(
  containerRef: RefObject<HTMLElement | null>,
  selector: string,
  attributes: string[],
) {
  const [rect, setRect] = useState<IndicatorRect | null>(null);
  const [animated, setAnimated] = useState(false);
  const attrKey = attributes.join(',');
  const activeRef = useRef<Element | null>(null);
  const rectRef = useRef<IndicatorRect | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const el = container?.querySelector<HTMLElement>(selector) ?? null;
    const next = el && el.offsetWidth > 0 ? { left: el.offsetLeft, width: el.offsetWidth } : null;
    const prev = rectRef.current;
    const same = prev && next && prev.left === next.left && prev.width === next.width;
    const switched = activeRef.current !== null && el !== null && activeRef.current !== el;
    if (el) activeRef.current = el;
    if (same || (prev === null && next === null)) return;
    rectRef.current = next;
    // Slide only when another item became active; any other geometry change snaps.
    setAnimated(switched && prev !== null && next !== null);
    setRect(next);
  }, [containerRef, selector]);

  useLayoutEffect(() => {
    // Measuring the DOM after commit is the one case that needs state set in a layout effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    const observeItems = () => {
      if (!ro) return;
      ro.disconnect();
      ro.observe(container);
      for (const child of Array.from(container.children)) {
        if (child.getAttribute('aria-hidden') !== 'true') ro.observe(child);
      }
    };
    observeItems();
    const mo =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            observeItems();
            measure();
          })
        : null;
    mo?.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: attrKey.split(','),
    });
    let live = true;
    if (typeof document !== 'undefined') {
      void document.fonts?.ready.then(() => {
        if (live) measure();
      });
    }
    return () => {
      live = false;
      mo?.disconnect();
      ro?.disconnect();
    };
  }, [containerRef, attrKey, measure]);

  return { rect, animated };
}
