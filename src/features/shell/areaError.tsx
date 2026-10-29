'use client';

import React from 'react';

import { PageError } from './PageError';

/** What the boundary shows. `framed` is for an area whose layout already mounts the app bar: the boundary then renders inside it. */
export type AreaErrorOptions = {
  /** What failed, as a noun phrase: "this loan". Default: "this page". */
  what?: string;
} & (
  | { framed: true }
  | {
      /** The app bar's title while the page is down. */
      title: string;
      crumb?: string;
      /** Where the phone back button goes (detail pages). */
      backHref?: string;
    }
);

export interface AreaErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry?: () => void;
}

/**
 * The error boundary of an area's `error.tsx`: `export default areaError({ crumb, title, backHref })`.
 * Keeps the app bar, says what failed and offers Retry (calls `reset`).
 */
export function areaError(options: AreaErrorOptions): (props: AreaErrorProps) => React.ReactElement {
  return function AreaError({ error, reset, unstable_retry }: AreaErrorProps) {
    const shell = 'framed' in options ? undefined : { title: options.title, crumb: options.crumb, backHref: options.backHref };
    return <PageError error={error} reset={reset} unstable_retry={unstable_retry} what={options.what} shell={shell} />;
  };
}
