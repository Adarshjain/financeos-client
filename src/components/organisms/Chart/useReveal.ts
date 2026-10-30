'use client';

import { useEffect, useState } from 'react';

/** False on the first paint, true right after mount: flips a CSS transition from its start state to its end state. */
export function useReveal(): boolean {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return revealed;
}
