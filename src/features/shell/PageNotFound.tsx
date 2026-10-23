'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { EmptyState } from '@/components/ds';
import { Illustration } from '@/components/organisms';

import { appHref, DS_HOME_HREF } from './routes';
import { ShellPage, type ShellPageProps } from './ShellPage';

export interface PageNotFoundProps {
  /** What was not found: "Account". Default: "Page". */
  what?: string;
  /** One line on why or what to do. */
  description?: string;
  /** Where the one action goes, as a Legacy path (appHref maps it). Default: Home. */
  backPath?: string;
  /** Label of the action. Default: "Go to Home". */
  backLabel?: string;
  /** Wraps the state in the app bar. */
  shell?: Pick<ShellPageProps, 'title' | 'crumb' | 'backHref'>;
}

/** A route's not-found page: says what is missing and offers one way back. */
export function PageNotFound({
  what = 'Page',
  description = 'It may have moved or been deleted.',
  backPath,
  backLabel = 'Go to Home',
  shell,
}: PageNotFoundProps) {
  const router = useRouter();
  const body = (
    <EmptyState
      illustration={<Illustration variant="notfound" />}
      title={`${what} not found`}
      description={description}
      action={{ label: backLabel, onSelect: () => router.push(backPath ? appHref(backPath) : DS_HOME_HREF) }}
    />
  );
  return shell ? <ShellPage {...shell}>{body}</ShellPage> : body;
}
