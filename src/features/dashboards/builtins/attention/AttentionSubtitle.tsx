'use client';

// The Inbox widget's subtitle: the counts of what needs you. "Most urgent first" until the inbox loads.

import React from 'react';

import { ATTENTION_SUBTITLE } from '@/features/dashboards/builtins/subtitlesModel';
import { useInbox } from '@/lib/query/hooks/useInbox';

export function AttentionSubtitle() {
  const { data } = useInbox();
  if (!data) return <>{ATTENTION_SUBTITLE}</>;
  return (
    <span data-testid="inbox-widget-counts">
      Act now {data.summary.actNow} · needs a look {data.summary.needsLook}
    </span>
  );
}
