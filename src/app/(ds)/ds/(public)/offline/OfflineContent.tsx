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
        description="Your money is exactly where you left it. We just can't reach the internet right now, so there's nothing fresh to show."
        action={{
          label: 'Try again',
          onSelect: () => window.location.reload(),
        }}
      />
    </main>
  );
}
