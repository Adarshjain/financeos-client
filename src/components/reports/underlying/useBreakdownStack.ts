'use client';

// The navigation state shared by every dialog that shows row breakdowns: a
// stack of breakdown frames (push opens a nested breakdown, pop is Back) and
// the transaction whose detail is open on top of them.

import { useCallback, useState } from 'react';

import type { BreakdownFrame } from './underlying.types';

export interface BreakdownStack {
  /** The open frames, outermost first. */
  stack: BreakdownFrame[];
  /** The frame on screen, or undefined when none is open. */
  top: BreakdownFrame | undefined;
  /** Opens a nested breakdown on top of the current one. */
  push: (frame: BreakdownFrame) => void;
  /** Back: closes the frame on top. */
  pop: () => void;
  /** The transaction whose detail is open, if any. */
  transactionId: string | null;
  openTransaction: (id: string) => void;
  closeTransaction: () => void;
}

/** Breakdown navigation, starting at `initial` (empty by default). */
export function useBreakdownStack(initial: BreakdownFrame[] = []): BreakdownStack {
  const [stack, setStack] = useState<BreakdownFrame[]>(initial);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const push = useCallback((frame: BreakdownFrame) => setStack((s) => [...s, frame]), []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const closeTransaction = useCallback(() => setTransactionId(null), []);
  return {
    stack,
    top: stack[stack.length - 1],
    push,
    pop,
    transactionId,
    openTransaction: setTransactionId,
    closeTransaction,
  };
}
