'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';

/** Fetches the raw log lines of a lookup and copies them as JSON (today's "Copy raw"). */
export function useCopyRawLog(currentRef: string | undefined, currentType: string = 'auto') {
  const [copying, setCopying] = useState(false);

  const copyRaw = async () => {
    if (!currentRef) return;
    setCopying(true);
    try {
      const { data, error } = await api.GET('/api/v1/diagnostics/lookup/raw', {
        params: {
          query: {
            ref: currentRef,
            type: currentType || 'auto',
          },
        },
      });
      if (error) {
        throw error;
      }
      const rawText = JSON.stringify(data ?? [], null, 2);
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(rawText);
        toast.success('Raw log entries copied to clipboard');
      }
    } catch {
      toast.error('Failed to fetch raw log lines');
    } finally {
      setCopying(false);
    }
  };

  return { copyRaw, copying };
}
