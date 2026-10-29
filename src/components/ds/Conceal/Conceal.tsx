'use client';

import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

/** What a hidden amount shows: a fixed width, so a row never changes size when the switch flips. */
export const CONCEAL_PLACEHOLDER = '₹ —';

const ConcealContext = createContext(false);

export interface ConcealProviderProps {
  /** Whether amounts below are hidden. The app owns the state (and where it is saved). */
  concealed: boolean;
  children?: React.ReactNode;
}

/** Tells every Conceal, TransactionRow, KpiTile… below it whether amounts are hidden. */
export function ConcealProvider({ concealed, children }: ConcealProviderProps) {
  useEffect(() => {
    setStoreConcealed(concealed);
    return () => setStoreConcealed(false);
  }, [concealed]);
  return <ConcealContext.Provider value={concealed}>{children}</ConcealContext.Provider>;
}

// Toasts render in the Toaster, which sits above any provider, so they read the flag from here.
let storeConcealed = false;
const storeListeners = new Set<() => void>();
function setStoreConcealed(next: boolean) {
  if (storeConcealed === next) return;
  storeConcealed = next;
  storeListeners.forEach((l) => l());
}

/** Like useConcealed, for components mounted outside the provider (the Toaster). */
export function useConcealedAnywhere(): boolean {
  return useSyncExternalStore(
    (l) => {
      storeListeners.add(l);
      return () => storeListeners.delete(l);
    },
    () => storeConcealed,
    () => false,
  );
}

/** True while amounts are hidden (false outside a ConcealProvider). */
export function useConcealed(): boolean {
  return useContext(ConcealContext);
}

/** An amount: an optional sign, ₹, digits with commas and decimals, and an optional L / Cr / K suffix. */
const MONEY = /[+\-−]?₹\s?[+\-−]?\d+(?:,\d+)*(?:\.\d+)?(?:\s?(?:Cr|L|K)(?![A-Za-z]))?/g;

/** Nothing to hide: empty, whitespace, or a dash standing in for "no value". */
const BARE_PLACEHOLDER = /^\s*[—–-]?\s*$/;

/** The text with every ₹ amount swapped for the placeholder; `whole` swaps the entire text (an empty or "—" value stays). */
export function concealText(text: string, whole = false, placeholder = CONCEAL_PLACEHOLDER): string {
  if (whole) return BARE_PLACEHOLDER.test(text) ? text : placeholder;
  return text.replace(MONEY, placeholder);
}

export interface ConcealProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** What to show while amounts are shown. A string is also what gets masked while hidden. */
  children?: React.ReactNode;
  /** Text to mask while hidden, when `children` is not a plain string (e.g. split into a fraction). */
  value?: string | number;
  /** What replaces a hidden amount (default "₹ —"); an empty string leaves the spot blank. */
  placeholder?: string;
  /** Replace the whole text with the placeholder, for a bare amount such as "3,600.00" that has no ₹. */
  whole?: boolean;
}

/**
 * Conceal shows its children, or "₹ —" in place of each amount while amounts are hidden.
 * Without `whole`, only ₹ amounts inside the text are replaced; other words stay.
 */
export const Conceal = React.forwardRef<HTMLSpanElement, ConcealProps>(function Conceal(
  { children, value, whole = false, placeholder = CONCEAL_PLACEHOLDER, ...props },
  ref,
) {
  const concealed = useConcealed();
  const source = value ?? (typeof children === 'string' || typeof children === 'number' ? children : undefined);
  let content: React.ReactNode = children;
  if (concealed) {
    if (source === undefined) content = whole ? placeholder : children;
    else content = concealText(String(source), whole, placeholder);
  }
  // Plain text with no wrapper, so layout never changes; a ref or native props ask for the element.
  if (ref === null && Object.values(props).every((v) => v === undefined)) return <>{content}</>;
  return (
    <span ref={ref} {...props}>
      {content}
    </span>
  );
});

Conceal.displayName = 'Conceal';
