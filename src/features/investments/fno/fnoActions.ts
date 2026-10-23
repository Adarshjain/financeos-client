'use server';

import { createDomainAction } from '@/lib/domainApi';

import { fetchFnoCsv } from './fnoServerApi';

/** The financial year's F&O trades as the server's ITR export CSV. */
export const exportFnoCsv = createDomainAction(
  { fallbackError: 'Failed to export F&O trades' },
  async (fy: number) => fetchFnoCsv(fy),
);
