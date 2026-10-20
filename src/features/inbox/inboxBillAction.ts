import type { InboxActionResponse, InboxItemResponse } from '@/lib/api/types';

import { type BillActionType, isBillAction } from './inbox.helpers';

export interface PendingBillAction {
  type: BillActionType;
  statementId: string;
}

/**
 * The dialog a row's bill action opens (mark paid, set details), or null when the action is not a
 * bill action or names no statement.
 */
export function toPendingBillAction(
  item: InboxItemResponse,
  action: InboxActionResponse,
): PendingBillAction | null {
  const statementId = action.payload?.statementId ?? item.refs.statementId;
  if (!statementId || !isBillAction(action.type)) return null;
  return { type: action.type, statementId };
}
