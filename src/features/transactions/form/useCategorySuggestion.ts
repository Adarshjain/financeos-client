'use client';

import { useRef, useState } from 'react';

import { categorizeDescription } from '@/features/transactions/transactionActions';
import { unwrapAction } from '@/lib/actionResult';
import type { CategoryPick } from '@/lib/categoryList.types';

/**
 * Add only: when the description field loses focus, asks the server (the user's rules, then the built-in engine, no AI)
 * for a category and hands it to `onSuggested`. A description is asked about once; a failure stays silent.
 */
export function useCategorySuggestion(onSuggested: (pick: CategoryPick) => void, enabled: boolean) {
  const [suggesting, setSuggesting] = useState(false);
  const askedRef = useRef<string | null>(null);

  const onDescriptionBlur = async (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (!enabled) return;
    const description = e.target.value.trim();
    if (description.length < 3 || askedRef.current === description) return;
    askedRef.current = description;
    setSuggesting(true);
    try {
      const data = await unwrapAction(categorizeDescription(description));
      if (data?.categoryKey) onSuggested({ categoryKey: data.categoryKey, subcategoryKey: data.subcategoryKey ?? null });
    } catch {
      // Silent suggestion
    } finally {
      setSuggesting(false);
    }
  };

  return { suggesting, onDescriptionBlur };
}
