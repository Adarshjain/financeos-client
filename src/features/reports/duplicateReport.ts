import { unwrapAction } from '@/lib/actionResult';

import { duplicateReportCopy } from './actions';

/** The name a copy of a report gets. */
export const copyName = (name: string): string => `${name} (copy)`;

/** Copies a report: fetches it, then creates "<name> (copy)" with the same definition. Resolves with the copy. */
export function duplicateReport(id: string) {
  return unwrapAction(duplicateReportCopy(id));
}
