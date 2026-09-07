import { toast } from 'sonner';

import { ApiError } from '@/lib/api/client';
import { AppError } from '@/lib/appError';
import { errorLog } from '@/lib/diagnostics/errorLog';
import { navigateTo } from '@/lib/diagnostics/navigate';
import { refOf } from '@/lib/diagnostics/ref';
import type { ErrorResponse } from '@/lib/types';

function extractErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.response && e.response.message && e.response.message.trim()) {
      return e.response.message;
    }
    if (e.message && e.message.trim()) {
      return e.message;
    }
  } else if (e instanceof AppError) {
    if (e.message && e.message.trim()) {
      return e.message;
    }
  } else if (e instanceof Error) {
    if (e.message && e.message.trim()) {
      return e.message;
    }
  } else if (typeof e === 'string' && e.trim()) {
    return e;
  } else if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    const msg = (e as { message: string }).message;
    if (msg.trim()) return msg;
  }
  return fallback;
}

export function toastError(e: unknown, fallback: string): void {
  const message = extractErrorMessage(e, fallback);
  const rec = errorLog.record(e, { message });
  const ref = rec.ref && rec.ref !== 'unknown' ? rec.ref : (refOf(e as Parameters<typeof refOf>[0]) || undefined);
  const hasRef = ref && ref !== 'unknown';

  toast.error(message, {
    description: hasRef ? `Ref ${ref}` : undefined,
    duration: rec.status >= 500 || rec.status === 0 ? 8000 : 5000,
    action: hasRef
      ? {
          label: 'Copy ID',
          onClick: (ev: React.MouseEvent) => {
            ev.preventDefault();
            if (navigator?.clipboard) {
              navigator.clipboard.writeText(ref);
            }
          },
        }
      : undefined,
    cancel: hasRef
      ? {
          label: 'Debug',
          onClick: () => {
            navigateTo('/debug?ref=' + encodeURIComponent(ref));
          },
        }
      : undefined,
  });
}

export function toastErrorResult(error: ErrorResponse, fallback: string): void {
  const message = error.message || fallback;
  const rec = errorLog.record(error, { message, source: 'action' });
  const ref = refOf(error) || rec.ref;
  const hasRef = ref && ref !== 'unknown';

  toast.error(message, {
    description: hasRef ? `Ref ${ref}` : undefined,
    duration: rec.status >= 500 || rec.status === 0 ? 8000 : 5000,
    action: hasRef
      ? {
          label: 'Copy ID',
          onClick: (ev: React.MouseEvent) => {
            ev.preventDefault();
            if (navigator?.clipboard) {
              navigator.clipboard.writeText(ref);
            }
          },
        }
      : undefined,
    cancel: hasRef
      ? {
          label: 'Debug',
          onClick: () => {
            navigateTo('/debug?ref=' + encodeURIComponent(ref));
          },
        }
      : undefined,
  });
}
