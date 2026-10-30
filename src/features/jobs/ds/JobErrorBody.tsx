'use client';

import React, { useState } from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { Icon } from '@/components/ds/Icon/Icon';
import { Text } from '@/components/ds/Text/Text';

/** "Error details (CODE)" toggle in danger tone; open, it shows the code and message in monospace. */
export function JobErrorBody({
  errorCode,
  errorMessage,
  defaultOpen = false,
}: {
  errorCode?: string | null;
  errorMessage?: string | null;
  /** Start with the code and message showing (the job result card). */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!errorCode && !errorMessage) return null;

  return (
    <div className="flex flex-col gap-space-6">
      <Text variant="label" tone="danger" as="div">
        <Button
          variant="link" size="sm"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          icon={<Icon name={open ? 'chevron-down' : 'chevron-right'} size="xs" />}
        >
          Error details ({errorCode || 'ERROR'})
        </Button>
      </Text>
      {open ? (
        <Banner tone="danger">
          <Text variant="caption" mono as="p" data-testid="job-error-text">
            {errorCode ? <strong>{errorCode}:</strong> : null}
            {errorCode ? ' ' : ''}
            {errorMessage}
          </Text>
        </Banner>
      ) : null}
    </div>
  );
}
