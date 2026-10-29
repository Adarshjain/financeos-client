'use client';

import { showToast } from '@/components/ds';
import { ApiError } from '@/lib/api/client';

import type { ImportWizardNotify } from './useImportWizard';

function detailOf(error: unknown): string {
  if (error instanceof ApiError) return error.response.message || error.message || '';
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
