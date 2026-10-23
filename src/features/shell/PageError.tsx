'use client';

import { useRouter } from 'next/navigation';
import React, { startTransition } from 'react';

import { ErrorState, Illustration } from '@/components/organisms';

import { ShellPage, type ShellPageProps } from './ShellPage';

export interface PageErrorProps {
  /** The route error boundary's `error`: only its digest is shown, never its message. */
  error: Error & { digest?: string };
  /** The boundary's `reset`: Try again re-renders the segment. */
  reset: () => void;
  /** Next's retry (refetches the server payload, then resets). Used when the boundary provides it. */
  unstable_retry?: () => void;
  /** What failed, as a noun phrase: "this account". Default: "this page". */
  what?: string;
  /** Wraps the state in the app bar (title, back) when the route has no layout that already does. */
  shell?: Pick<ShellPageProps, 'title' | 'crumb' | 'backHref'>;
}

/** A route's error boundary: says what failed, how to fix it, and offers Try again. Keeps the app shell. */
export function PageError({ error, reset, unstable_retry, what = 'this page', shell }: PageErrorProps) {
  const router = useRouter();
  const retry = () => {
    if (unstable_retry) return unstable_retry();
    startTransition(() => {
      router.refresh();
      reset();
    });
  };
  const body = (
    <ErrorState
      illustration={<Illustration variant="error" />}
      title={`Could not load ${what}`}
      description="The request failed. Try again, and quote the reference if it keeps failing."
      action={{ label: 'Try again', onSelect: retry }}
      reference={error.digest}
    />
  );
  return shell ? <ShellPage {...shell}>{body}</ShellPage> : body;
}
