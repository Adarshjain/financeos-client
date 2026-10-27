import type { Metadata } from 'next';
import React from 'react';

import { OfflineContent } from './OfflineContent';

export const metadata: Metadata = {
  title: 'Offline · FinanceOS',
};

export default function DsOfflinePage() {
  return <OfflineContent />;
}
