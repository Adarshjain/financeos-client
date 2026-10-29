import { isLegacyPath, legacyHref } from '@/features/shell/routes';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { copyText } from '@/lib/copyText';
import { errorLog } from '@/lib/diagnostics/errorLog';
import { navigateTo } from '@/lib/diagnostics/navigate';
import { refOf } from '@/lib/diagnostics/ref';
import { notify } from '@/lib/notify';
import type { ErrorResponse } from '@/lib/types';

/** The diagnostics page for `ref`: the Legacy one when the user is inside Legacy, else the plain path. */
function debugHref(ref: string): string {
  const path = '/debug?ref=' + encodeURIComponent(ref);
  return typeof window !== 'undefined' && isLegacyPath(window.location.pathname) ? legacyHref(path) : path;
}

function extractErrorMessage(e: unknown, fallback: string): string {
  const known = getErrorMessage(e, '');
  if (known.trim()) return known;
  if (e instanceof Error) {
    if (e.message && e.message.trim()) return e.message;
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

  notify.error(message, {
    description: hasRef ? `Ref ${ref}` : undefined,
    duration: rec.status >= 500 || rec.status === 0 ? 8000 : 5000,
    action: hasRef
      ? {
          label: 'Copy ID',
          onClick: (ev: React.MouseEvent) => {
            ev.preventDefault();
            void copyText(ref);
          },
        }
      : undefined,
    cancel: hasRef
      ? {
          label: 'Debug',
          onClick: () => {
            navigateTo(debugHref(ref));
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

  notify.error(message, {
    description: hasRef ? `Ref ${ref}` : undefined,
    duration: rec.status >= 500 || rec.status === 0 ? 8000 : 5000,
    action: hasRef
      ? {
          label: 'Copy ID',
          onClick: (ev: React.MouseEvent) => {
            ev.preventDefault();
            void copyText(ref);
          },
        }
      : undefined,
    cancel: hasRef
      ? {
          label: 'Debug',
          onClick: () => {
            navigateTo(debugHref(ref));
          },
        }
      : undefined,
  });
}
