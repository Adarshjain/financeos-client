import { showToast } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { formatDate } from '@/lib/format';

import type { InboxNotifier } from './useInboxMutations';

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
};
