'use client';

import { showToast } from '@/components/ds/Toast/Toast';
import { getErrorMessage } from '@/lib/api/errorMessage';

import type { ImportWizardNotify } from './useImportWizard';

/** What the server said, or '' for an unexpected failure (the action's own fallback text, which the toast already says). */
const detailOf = (error: unknown): string => getErrorMessage(error, '');

/** The wizard's messages as Dinero toasts; a thrown error reads "Couldn't preview import: <what the server said>". */
export const dineroImportNotify: ImportWizardNotify = {
  error: (message) => void showToast(message, { tone: 'danger' }),
  info: (message) => void showToast(message),
  caught: (error, fallback) => {
    const detail = detailOf(error);
    void showToast(detail ? `${fallback}: ${detail}` : `${fallback}. Try again.`, { tone: 'danger' });
  },
};
