'use client';

import React from 'react';

import { useShellCounts } from '@/lib/query/hooks/useShellCounts';

const subscribeNever = () => () => undefined;

export interface DataSourceIssues {
  /** Gmail items needing the user plus mailboxes needing a reconnect. */
  connections: number;
  /** Failed import jobs, the ones the Inbox "couldn't finish" row counts. */
  failedJobs: number;
  total: number;
}

const NONE: DataSourceIssues = { connections: 0, failedJobs: 0, total: 0 };

/**
 * The data-source warning signal from the shell counts (zeros while loading or when that part failed).
 * Waits for hydration, so the server HTML and the first client render match: both draw none.
 */
export function useDataSourceIssues(): DataSourceIssues {
  const { data } = useShellCounts({ enabled: true });
  const hydrated = React.useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!hydrated) return NONE;
  const connections = data?.dataSources?.connections ?? 0;
  const failedJobs = data?.dataSources?.failedJobs ?? 0;
  return { connections, failedJobs, total: connections + failedJobs };
}
