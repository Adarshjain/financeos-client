'use client';

import { showToast } from '@/components/ds';
import { ActionError } from '@/lib/actionResult';

import type { ImportWizardNotify } from './useImportWizard';

function detailOf(error: unknown): string {
  // An unexpected failure on the server comes back as the action's own fallback text, which the toast already says.
  if (error instanceof ActionError && error.code === 'UNKNOWN_ERROR') return '';
  return error instanceof Error ? error.message : '';
}

/** The wizard's messages as Dinero toasts; a thrown error reads "Couldn't preview import: <what the server said>". */
export const dineroImportNotify: ImportWizardNotify = {
  error: (message) => void showToast(message, { tone: 'danger' }),
  info: (message) => void showToast(message),
  caught: (error, fallback) => {
    const detail = detailOf(error);
    void showToast(detail ? `${fallback}: ${detail}` : `${fallback}. Try again.`, { tone: 'danger' });
  },
};
