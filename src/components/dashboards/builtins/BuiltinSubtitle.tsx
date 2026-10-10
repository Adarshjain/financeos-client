'use client';

// The muted one-liner under a built-in widget's title, and the lookups some
// built-ins need for it (a single card's name).

import { useAccounts } from '@/lib/query/hooks/useAccounts';

export const SUBTITLE_CLASS = 'truncate text-2xs leading-4 text-slate-500 dark:text-slate-400';

/** The muted subtitle line. */
export function SubtitleText({ children }: { children: string }) {
  return <p className={SUBTITLE_CLASS}>{children}</p>;
}

/** A card-scoped widget's subtitle: that card's name ("One card" until the list loads or when it is gone). */
export function CardNameSubtitle({ accountId }: { accountId: string }) {
  const { data: accounts } = useAccounts();
  const name = accounts?.find((a) => a.id === accountId)?.name ?? 'One card';
  return <SubtitleText>{name}</SubtitleText>;
}
