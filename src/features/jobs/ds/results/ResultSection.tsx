'use client';

import React, { useState } from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Icon } from '@/components/ds/Icon/Icon';
import { Text } from '@/components/ds/Text/Text';

/** A titled, collapsible block inside a job result: "Title (n)" toggle, body when open. Nothing when empty. */
export function ResultSection({
  title,
  count,
  defaultOpen = false,
  tone = 'ink',
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  tone?: 'ink' | 'danger';
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;

  return (
    <div className="flex flex-col gap-space-6" data-testid="result-section" data-title={title}>
      <Text variant="label" tone={tone} as="div">
        <Button
          variant="link" size="sm"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          icon={<Icon name={open ? 'chevron-down' : 'chevron-right'} size="xs" />}
        >
          {title} ({count})
        </Button>
      </Text>
      {open ? <div className="flex flex-col gap-space-4">{children}</div> : null}
    </div>
  );
}
