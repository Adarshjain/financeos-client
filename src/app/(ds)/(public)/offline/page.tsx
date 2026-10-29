import type { Metadata } from 'next';
import React from 'react';

import { OfflineContent } from './OfflineContent';

export const metadata: Metadata = {
  title: 'Offline',
};

export default function DsOfflinePage() {
  return <OfflineContent />;
}
