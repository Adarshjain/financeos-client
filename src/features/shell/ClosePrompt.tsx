'use client';

import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';

export interface ClosePromptProps {
  /** The question, as the bold lead-in. */
  title: string;
  /** What the question rests on; leave out when the question says it all. */
  body?: string;
  confirmLabel: string;
  dismissLabel?: string;
  onConfirm: () => void;
  onDismiss: () => void;
  /** An answer is being saved: both buttons wait. */
  busy?: boolean;
  className?: string;
}

/** A question about closing something, with the two answers: close it, or not yet. */
export function ClosePrompt({
  title,
  body,
  confirmLabel,
  dismissLabel = 'Not yet',
  onConfirm,
  onDismiss,
  busy = false,
  className,
}: ClosePromptProps) {
  return (
    <Banner tone="info" title={title} className={className}>
      {body ? <span>{body} </span> : null}
      <span className="inline-flex items-center gap-space-12 align-middle">
        <Button variant="link" size="sm" disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="link" size="sm" disabled={busy} onClick={onDismiss}>
          {dismissLabel}
        </Button>
      </span>
    </Banner>
  );
}
