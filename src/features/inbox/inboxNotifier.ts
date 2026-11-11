import { showToast } from '@/components/ds/Toast/Toast';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { formatDate } from '@/lib/format';

import { type InboxNotifier, npsPendingMessage } from './useInboxMutations';

/** The Dinero Toasts for snooze, dismiss and undo (copy from board P-inbox-states). */
export const dsInboxNotifier: InboxNotifier = {
  snoozed: (until, undo) =>
    showToast(`Snoozed until ${formatDate(until, 'list')}`, { action: { label: 'Undo', onSelect: undo } }),
  dismissed: (undo) => showToast('Item dismissed', { action: { label: 'Undo', onSelect: undo } }),
  restored: () => showToast('Item restored'),
  snoozeFailed: () => showToast("Couldn't snooze. The row is back.", { tone: 'danger' }),
  dismissFailed: () => showToast("Couldn't dismiss. The row is back.", { tone: 'danger' }),
  undoFailed: (e) => showToast(getErrorMessage(e, "Couldn't undo. Try again."), { tone: 'danger' }),
  epfLinked: () => showToast('Linked to the EPF withdrawal'),
  epfDismissed: () => showToast('Item dismissed'),
  epfFailed: (e) => showToast(getErrorMessage(e, "Couldn't update. The row is back."), { tone: 'danger' }),
  npsPendingDone: (outcome) => showToast(npsPendingMessage(outcome)),
  npsPendingFailed: (e) => showToast(getErrorMessage(e, "Couldn't update. The row is back."), { tone: 'danger' }),
  npsPaymentDone: (action) =>
    showToast({ link: 'Linked to the NPS contribution', dismiss: 'Item dismissed', record: 'Recorded as an NPS contribution', not_nps: 'Marked as not NPS' }[action]),
  npsPaymentFailed: (e) => showToast(getErrorMessage(e, "Couldn't update. The row is back."), { tone: 'danger' }),
  corporateActionDone: (action) => showToast(action === 'undo' ? 'Removed' : 'Item dismissed'),
  corporateActionFailed: (e) => showToast(getErrorMessage(e, "Couldn't update. The row is back."), { tone: 'danger' }),
  statementSkipped: (undo) => showToast('No statement this period', { action: { label: 'Undo', onSelect: undo } }),
  statementSkipFailed: (e) =>
    showToast(getErrorMessage(e, "Couldn't mark this period. The row is back."), { tone: 'danger' }),
};
