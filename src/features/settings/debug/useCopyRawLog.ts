'use client';

import { useState } from 'react';

import { loadRawLog } from '@/features/settings/debug/diagnosticsActions';
import { unwrapAction } from '@/lib/actionResult';
import { copyText } from '@/lib/copyText';
import { notify } from '@/lib/notify';

/** Fetches the raw log lines of a lookup and copies them as JSON (today's "Copy raw"). */
export function useCopyRawLog(currentRef: string | undefined, currentType: string = 'auto') {
  const [copying, setCopying] = useState(false);

  const copyRaw = async () => {
    if (!currentRef) return;
    setCopying(true);
    try {
      const data = await unwrapAction(loadRawLog(currentRef, currentType));
      const rawText = JSON.stringify(data, null, 2);
      if (!(await copyText(rawText))) throw new Error('clipboard unavailable');
      notify.success('Raw log entries copied to clipboard');
    } catch {
      notify.error("Couldn't copy the raw log. Try again.");
    } finally {
      setCopying(false);
    }
  };

  return { copyRaw, copying };
}
