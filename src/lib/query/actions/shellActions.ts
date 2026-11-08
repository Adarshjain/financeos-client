'use server';

import { serverApi } from '@/lib/api/server';
import type { ShellCounts } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';

/** The shell's badge counts in one request (inbox, needs review, unread notifications, app lock). */
export const loadShellCounts = action('shell.loadShellCounts', createDomainAction(
  { fallbackError: "Couldn't load the counts. Try again." },
  async (): Promise<ShellCounts> => {
    const { data } = await serverApi.GET('/api/v1/shell/counts');
    return data as ShellCounts;
  },
));
