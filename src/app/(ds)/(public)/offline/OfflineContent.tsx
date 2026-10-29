'use client';

import React from 'react';

import { EmptyState } from '@/components/ds';
import { Illustration } from '@/components/organisms';

export function OfflineContent() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-space-20">
      <EmptyState
        illustration={<Illustration variant="offline" />}
        title="You're offline"
        description="Check your connection."
        action={{
          label: 'Retry',
          onSelect: () => window.location.reload(),
        }}
      />
    </main>
  );
}
