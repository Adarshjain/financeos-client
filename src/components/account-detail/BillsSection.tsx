'use client';

import { BillsDueWidget } from '@/components/bills/BillsDueWidget';

export function BillsSection({ accountId }: { accountId: string }) {
  return <BillsDueWidget accountId={accountId} className="h-full" />;
}
