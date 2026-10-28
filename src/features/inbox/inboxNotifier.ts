import { showToast } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { formatDate } from '@/lib/format';

import type { InboxNotifier } from './useInboxActions';

/** The Dinero Toasts for snooze, dismiss and undo (copy from board P-inbox-states). */
export const dsInboxNotifier: InboxNotifier = {
  snoozed: (until, undo) =>
    showToast(`Snoozed until ${formatDate(until, 'list')}`, { action: { label: 'Undo', onSelect: undo } }),
  dismissed: (undo) => showToast('Dismissed', { action: { label: 'Undo', onSelect: undo } }),
  restored: () => showToast('Restored'),
  snoozeFailed: () => showToast("Couldn't snooze. The row is back.", { tone: 'danger' }),
  dismissFailed: () => showToast("Couldn't dismiss. The row is back.", { tone: 'danger' }),
  undoFailed: (e) => showToast(getErrorMessage(e, 'Could not undo'), { tone: 'danger' }),
  epfLinked: () => showToast('Linked to the EPF withdrawal'),
  epfDismissed: () => showToast('Dismissed'),
  epfFailed: (e) => showToast(getErrorMessage(e, "Couldn't update. The row is back."), { tone: 'danger' }),
};
