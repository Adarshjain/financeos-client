'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Tracks an element's content-box size via ResizeObserver, through a callback
 * ref so it attaches whenever the node mounts. Starts at 0×0 (first paint /
 * jsdom), so callers should treat 0 as "unknown".
 */
export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node || typeof ResizeObserver === 'undefined') return;
    observer.current = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height }
      );
    });
    observer.current.observe(node);
  }, []);

  return [ref, size] as const;
}
