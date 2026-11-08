'use client';

import React, { useTransition } from 'react';

import { ErrorState } from '@/components/organisms/ErrorState/ErrorState';
import { useAppRouter } from '@/lib/useAppRouter';

export interface LoadErrorProps {
  /** What failed, as a noun phrase: "loans". The title reads "Couldn't load <what>". */
  what: string;
  /** The request/error reference to quote. Shows the line about it and the copy button. */
  reference?: string;
  /** Re-runs the load. Default: refresh the route's server payload. */
  retry?: () => void;
  /** The custom `retry` is still running (a query's `isFetching`): Retry shows its loading state. */
  retrying?: boolean;
}

/** A screen or section whose data failed to load: says what failed, offers Retry, quotes the reference. */
export function LoadError({ what, reference, retry, retrying }: LoadErrorProps) {
  const router = useAppRouter();
  const [refreshing, startRefresh] = useTransition();
  return (
    <ErrorState
      title={`Couldn't load ${what}`}
      description={reference ? 'If it keeps failing, quote the reference.' : undefined}
      action={{ label: 'Retry', loading: retry ? retrying : refreshing, onSelect: retry ?? (() => startRefresh(() => router.refresh())) }}
      reference={reference}
    />
  );
}
