'use client';

// Whether an element has come near the viewport: false until it is within `rootMargin` of it, then true for good
// (a widget fetches once when it scrolls into view and stays loaded). Without IntersectionObserver (old browsers,
// tests) the element counts as in view once mounted (the first render is false on server and client alike, so hydration agrees), so nothing is held back.

import React from 'react';

export const IN_VIEW_ROOT_MARGIN = '200px';

export function useInView<T extends Element = HTMLDivElement>(rootMargin: string = IN_VIEW_ROOT_MARGIN) {
  const [inView, setInView] = React.useState(false);
  const [node, setNode] = React.useState<T | null>(null);
  const ref = React.useCallback((el: T | null) => setNode(el), []);

  React.useEffect(() => {
    if (inView) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, node, rootMargin]);

  return { ref, inView };
}
