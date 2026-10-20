'use client';

import React, { useState } from 'react';

import { Banner, Button, Icon, Text } from '@/components/ds';

/** "Error details (CODE)" toggle in danger tone; open, it shows the code and message in monospace. */
export function JobErrorBody({
  errorCode,
  errorMessage,
}: {
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const [open, setOpen] = useState(false);
  if (!errorCode && !errorMessage) return null;

  return (
    <div className="flex flex-col gap-space-6">
      <Text variant="label" tone="danger" as="div">
        <Button
          variant="link"
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
