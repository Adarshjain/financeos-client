import { ApiError } from '@/lib/api/client';

/** Shown when an edit or delete answers 404: the action was already deleted, or isn't the caller's. */
export const CORPORATE_ACTION_GONE_MESSAGE =
  'That corporate action is no longer in your account. The list has been refreshed.';

/**
 * Corporate actions are per user: editing or deleting one that was already deleted (another tab) or
 * that belongs to someone else answers 404. Callers then refresh their list instead of failing hard.
 */
export function isCorporateActionGone(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}
