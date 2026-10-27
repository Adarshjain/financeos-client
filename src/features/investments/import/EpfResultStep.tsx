'use client';

import React from 'react';

import { Card, Text } from '@/components/ds';

import { type EpfImportResult, resultLine, resultTitle } from './epfImportModel';

/** Step 3 for the EPFO passbook: how many entries went in. */
export function EpfResultStep({ result }: { result: EpfImportResult }) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-space-4 p-space-20 text-center">
        <Text variant="title" as="h2">
          {resultTitle(result)}
        </Text>
        <Text variant="body" tone="ink-3" as="p">
          {resultLine(result)}
        </Text>
      </div>
    </Card>
  );
}
