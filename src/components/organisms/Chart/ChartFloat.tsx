'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { placeFloat } from './chartGeometry';

/**
 * Positions a hover card next to a point of the chart (pointer coordinates in the chart's own box):
 * right and below by default, flipped to the left / above when it would run out, and always kept
 * inside the chart box. The card is measured before paint, so it never flashes in the wrong place.
 */
export function ChartFloat({
  x,
  y,
  width,
  height,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [card, setCard] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const [w, h] = [el.offsetWidth, el.offsetHeight];
    setCard((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, [x, y, width, height, children]);
  const { left, top } = placeFloat(x, y, width, height, card.w, card.h);
  return (
    <div ref={ref} className="pointer-events-none absolute z-floating w-max" style={{ left, top }}>
      {children}
    </div>
  );
}
