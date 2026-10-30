'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { ErrorState } from '@/components/organisms/ErrorState/ErrorState';

export interface LoadErrorProps {
  /** What failed, as a noun phrase: "loans". The title reads "Couldn't load <what>". */
  what: string;
  /** The request/error reference to quote. Shows the line about it and the copy button. */
  reference?: string;
  /** Re-runs the load. Default: refresh the route's server payload. */
  retry?: () => void;
}

/** A screen or section whose data failed to load: says what failed, offers Retry, quotes the reference. */
export function LoadError({ what, reference, retry }: LoadErrorProps) {
  const router = useRouter();
  return (
    <ErrorState
      title={`Couldn't load ${what}`}
      description={reference ? 'If it keeps failing, quote the reference.' : undefined}
      action={{ label: 'Retry', onSelect: retry ?? (() => router.refresh()) }}
      reference={reference}
    />
  );
}
