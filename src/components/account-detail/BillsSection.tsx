'use client';

import { BillsDueWidget } from '@/components/bills/BillsDueWidget';

/** The Bills due widget for one card, sized to its content and scrolling past 420px. */
export function BillsSection({ accountId }: { accountId: string }) {
  return <BillsDueWidget accountId={accountId} className="h-auto max-h-[420px]" />;
}
