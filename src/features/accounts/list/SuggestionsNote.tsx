'use client';

import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';

export const SUGGESTIONS_NOTE_KEY = 'financeos.accounts.suggestionsNoteDismissed';

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(SUGGESTIONS_NOTE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * The note above email-found suggestions: they can miss an account or get a detail wrong. Dismissed once with ×, it
 * stays hidden in this browser (localStorage). Shown only after mount so a dismissed note never flashes in.
 */
export function SuggestionsNote() {
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => setShown(!readDismissed()), []);

  if (!shown) return null;
  return (
    <Banner
      tone="neutral"
      data-testid="suggestions-note"
      onDismiss={() => {
        try {
          window.localStorage.setItem(SUGGESTIONS_NOTE_KEY, '1');
        } catch {
          // storage blocked: hide for this visit only
        }
        setShown(false);
      }}
    >
      We find these from your bank emails, so we can miss an account or get a detail wrong. Check each one before you
      add it, and add any we missed yourself.
    </Banner>
  );
}
