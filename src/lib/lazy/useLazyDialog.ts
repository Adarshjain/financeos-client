'use client';

import React from 'react';

import { notify } from '@/lib/notify';

type Importer<C> = () => Promise<C>;

interface Entry<C> {
  promise: Promise<C> | null;
  value: C | undefined;
  loaded: boolean;
}

// Keyed by the importer function (a module-level constant at every call site), so a loaded dialog stays cached for the session.
const entries = new WeakMap<Importer<unknown>, Entry<unknown>>();

function entryOf<C>(importer: Importer<C>): Entry<C> {
  let entry = entries.get(importer as Importer<unknown>) as Entry<C> | undefined;
  if (!entry) {
    entry = { promise: null, value: undefined, loaded: false };
    entries.set(importer as Importer<unknown>, entry as Entry<unknown>);
  }
  return entry;
}

function start<C>(importer: Importer<C>): Promise<C> {
  const entry = entryOf(importer);
  if (!entry.promise) {
    entry.promise = importer().then(
      (value) => {
        entry.value = value;
        entry.loaded = true;
        return value;
      },
      (error: unknown) => {
        // A failed import is retried on the next press.
        entry.promise = null;
        throw error;
      },
    );
  }
  return entry.promise;
}

export interface LazyDialog<C> {
  /** The loaded module (null until the first successful load). Render it when the dialog is open. */
  Component: C | null;
  /** True while a press is waiting for the code. */
  loading: boolean;
  /** Starts the import without waiting; call it on pointerdown / keydown of the trigger. Never throws. */
  preload: () => void;
  /**
   * Runs `onReady` once the code is loaded: at once when it already is, else after the import (the trigger shows `loading`).
   * On a failed import it stops loading, shows the error toast and does not call `onReady`. Resolves to whether `onReady` ran.
   */
  run: (onReady: () => void) => Promise<boolean>;
}

/**
 * Loads a rarely used dialog's code on the user's press instead of with the page. The code is not in the page's
 * bundle and is not warmed on idle; once loaded it stays cached, so the next open is instant.
 */
export function useLazyDialog<C>(importer: Importer<C>): LazyDialog<C> {
  const [Component, setComponent] = React.useState<C | null>(() => {
    const entry = entryOf(importer);
    return entry.loaded ? (entry.value as C) : null;
  });
  const [loading, setLoading] = React.useState(false);

  const preload = React.useCallback(() => {
    start(importer).catch(() => undefined);
  }, [importer]);

  const run = React.useCallback(
    async (onReady: () => void) => {
      const entry = entryOf(importer);
      if (entry.loaded) {
        setComponent(() => entry.value as C);
        onReady();
        return true;
      }
      setLoading(true);
      try {
        const value = await start(importer);
        setComponent(() => value);
        setLoading(false);
        onReady();
        return true;
      } catch {
        setLoading(false);
        notify.error('Could not load this. Check your connection and try again.');
        return false;
      }
    },
    [importer],
  );

  return { Component, loading, preload, run };
}
