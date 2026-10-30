import { toast } from 'sonner';

import { showToast } from '@/components/ds/Toast/Toast';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { errorLog } from '@/lib/diagnostics/errorLog';
import { toastError } from '@/lib/toastError';

/** How the reward forms and actions tell the user what happened. The default is Legacy's sonner toasts. */
export interface RewardNotifier {
  success: (message: string) => void;
  error: (message: string) => void;
  /** A failed request: the server's own message, or the fallback. */
  failure: (error: unknown, fallback: string) => void;
}

export const sonnerRewardNotifier: RewardNotifier = {
  success: (message) => toast.success(message),
  error: (message) => toast.error(message),
  failure: (e, fallback) => toastError(e, fallback),
};

/** Dinero Toasts (the only Toaster under /ds): failures are still recorded for diagnostics, as toastError does. */
export const dsRewardNotifier: RewardNotifier = {
  success: (message) => showToast(message),
  error: (message) => showToast(message, { tone: 'danger' }),
  failure: (e, fallback) => {
    const message = getErrorMessage(e, fallback);
    errorLog.record(e, { message });
    showToast(message, { tone: 'danger' });
  },
};
