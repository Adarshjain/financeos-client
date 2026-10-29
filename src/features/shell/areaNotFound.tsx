'use client';

import React from 'react';

import { PageNotFound } from './PageNotFound';

export interface AreaNotFoundOptions {
  /** The app bar's title while the page is missing. */
  title: string;
  crumb?: string;
  /** The area's own page: the phone back button and the one action go here. */
  backHref: string;
  /** Label of the action: "Back to accounts". */
  backLabel: string;
  /** What was not found: "Account". */
  what: string;
  /** One line on why. Default: "It may have been deleted." */
  description?: string;
  /** The area layout already mounts the app bar: render the body only. */
  framed?: boolean;
}

/** The not-found page of a `[id]` folder: `export default areaNotFound({ crumb, title, backHref, backLabel, what })`; `framed` when its layout already mounts the bar. */
export function areaNotFound({
  title,
  crumb,
  backHref,
  backLabel,
  what,
  description = 'It may have been deleted.',
  framed = false,
}: AreaNotFoundOptions): () => React.ReactElement {
  return function AreaNotFound() {
    return (
      <PageNotFound
        what={what}
        description={description}
        backPath={backHref}
        backLabel={backLabel}
        shell={framed ? undefined : { title, crumb, backHref }}
      />
    );
  };
}
