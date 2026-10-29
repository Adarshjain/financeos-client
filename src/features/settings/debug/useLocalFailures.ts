'use client';

import { useSyncExternalStore } from 'react';

import { copyText } from '@/lib/copyText';
import { useDiagnostics } from '@/lib/diagnostics/DiagnosticsProvider';
import { type DiagnosticRecord, errorLog } from '@/lib/diagnostics/errorLog';
import { notify } from '@/lib/notify';

/** The client error ring buffer and its actions: copy a reference, copy all, share, clear. */
export function useLocalFailures() {
  const records = useSyncExternalStore(errorLog.subscribe, errorLog.getSnapshot, () => []);
  const { pageRequestId, sessionId } = useDiagnostics();

  const reportText = (): string => {
    const lines: string[] = [];
    lines.push('=== FinanceOS Diagnostics Report ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    if (pageRequestId) lines.push(`Page Request ID: ${pageRequestId}`);
    if (sessionId) lines.push(`Faro Session ID: ${sessionId}`);
    lines.push(`Total Local Records: ${records.length}`);
    lines.push('----------------------------------------');

    for (const r of records) {
      lines.push(`${r.at} | ${r.ref} | HTTP ${r.status} (${r.code}) | ${r.method ?? 'GET'} ${r.endpoint ?? r.route} | ${r.message}`);
    }

    return lines.join('\n');
  };

  /** Copies the reference; true when the clipboard was available. */
  const copyRef = (rec: DiagnosticRecord): boolean => {
    if (!navigator?.clipboard) return false;
    void copyText(rec.ref);
    notify.success(`Reference ${rec.ref} copied`);
    return true;
  };

  const copyAll = () => {
    if (!navigator?.clipboard) return;
    void copyText(reportText());
    notify.success('Diagnostics report copied to clipboard');
  };

  const share = async () => {
    const text = reportText();
    if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'FinanceOS Diagnostics Report',
          text,
        });
        return;
      } catch {
        // Fall back to the clipboard if the user dismissed the sheet or sharing failed.
      }
    }
    copyAll();
  };

  const clear = () => {
    errorLog.clear();
    notify.info('Local error history cleared');
  };

  return { records, copyRef, copyAll, share, clear };
}
