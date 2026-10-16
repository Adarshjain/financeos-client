'use client';

import React from 'react';

import { Button, EmptyState } from '@/components/ds';

export function OfflineContent() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-space-20">
      <EmptyState
        variant="offline"
        title="You're offline"
        description="Your money is exactly where you left it. We just can't reach the internet right now, so there's nothing fresh to show."
        action={
          <Button variant="primary" onClick={() => window.location.reload()}>
            Try again
          </Button>
        }
      />
    </main>
  );
}
