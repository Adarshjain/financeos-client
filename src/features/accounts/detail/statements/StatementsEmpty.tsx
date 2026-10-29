'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Card, EmptyState } from '@/components/ds';

/** The account has no statements at all: the live empty copy, and the way to add one. */
export function StatementsEmpty({ accountId }: { accountId: string }) {
  const router = useRouter();
  return (
    <Card>
      <EmptyState
        title="No statements yet"
        description="Statements accumulate automatically when ingested via file upload or Gmail automatic sync. Upload your statements in settings or verify your sync rules."
        action={{
          label: 'Upload statement',
          onSelect: () => router.push(`/transactions/import?account=${accountId}`),
        }}
      />
    </Card>
  );
}
