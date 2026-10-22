'use client';

/// <reference types="react/canary" />

import { usePathname } from 'next/navigation';
import type { ViewTransitionProps } from 'react';
import * as React from 'react';

/**
 * React's <ViewTransition> where the running React has it (Next's vendored React in the app), else a
 * passthrough (the plain React that unit tests run on). It only animates updates made in a transition
 * (Link, router.push/refresh, startTransition, useDeferredValue, Suspense reveals); the CSS that gives the
 * class names below their motion lives in src/app/(ds)/ds.css. Browsers without View Transitions update
 * instantly.
 */
const native = (React as unknown as { ViewTransition?: React.ComponentType<ViewTransitionProps> }).ViewTransition;

function Passthrough({ children }: ViewTransitionProps) {
  return <>{children}</>;
}

export const ViewTransition: React.ComponentType<ViewTransitionProps> = native ?? Passthrough;

/**
 * The page: every navigation between pages (and skeleton to content) crossfades it. Its one element keeps
 * the page's top bar and lists free to take their own layers. The shell around it never fades.
 *
 * Not on the first page the app opens on: its streamed sections arrive in quick reveals while the user
 * may already be pressing, and a running view transition sends every press to <html>. The fade starts
 * with the first move to another page.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [firstPath] = React.useState(pathname);
  const [navigated, setNavigated] = React.useState(false);
  if (!navigated && pathname !== firstPath) setNavigated(true);
  return (
    <ViewTransition default="none" update={navigated || pathname !== firstPath ? 'ds-page' : 'none'}>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </ViewTransition>
  );
}

/**
 * A list's own boundary: it never animates itself, and it keeps its rows still when the whole list
 * arrives or leaves (page load, navigation, skeleton to content). Only rows that come and go while the
 * list stays animate.
 */
export function ListTransition({ children }: { children: React.ReactNode }) {
  return <ViewTransition default="none">{children}</ViewTransition>;
}

/** One row of a list (give it the row's key): it slides in, folds away when it leaves, and moves with the list. */
export function RowTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="ds-row-enter" exit="ds-row-exit" update="ds-row-move" share="none">
      {children}
    </ViewTransition>
  );
}

/**
 * A part that grows into its detail: the same `name` on the row's part and on the detail's header part
 * morphs one into the other when a navigation swaps them. Only one may be on the page at a time. The child
 * must render a single element.
 */
export function SharedName({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <ViewTransition name={name} share="ds-morph" enter="none" exit="none" update="none">
      {children}
    </ViewTransition>
  );
}

/**
 * Rows fed by react-query change outside a transition, so they would not animate. This hands back the
 * previous rows for the urgent render and the new ones in a deferred (transition) render, which animates.
 * A first load (nothing shown yet) comes through at once.
 */
export function useDeferredRows<T extends readonly unknown[]>(rows: T): T {
  const deferred = React.useDeferredValue(rows);
  return deferred.length === 0 ? rows : deferred;
}
