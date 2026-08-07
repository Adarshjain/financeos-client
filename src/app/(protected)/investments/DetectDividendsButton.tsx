'use client';

import { DividendSuggestionsDialog } from './DividendSuggestionsDialog';

interface DetectDividendsButtonProps {
  onSuccess?: () => void;
}

export function DetectDividendsButton({ onSuccess }: DetectDividendsButtonProps) {
  return <DividendSuggestionsDialog onSuccess={onSuccess} />;
}
