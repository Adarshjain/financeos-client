'use client';

import React, { forwardRef } from 'react';

import { type ActionTarget } from '@/components/ds/Button/ActionButton';
import { EmptyState, type EmptyStateProps } from '@/components/ds/EmptyState/EmptyState';
import { copyText } from '@/lib/copyText';

export interface ErrorStateProps
  extends Omit<EmptyStateProps, 'title' | 'action' | 'secondaryAction' | 'compact' | 'children'> {
  /** What failed: "Could not load transactions". */
  title: React.ReactNode;
  /** One sentence on what to do. */
  description?: React.ReactNode;
  /** Retries the failed request: action={{ label: 'Retry', onSelect }}. Without it there is no retry button. */
  action?: { label: string } & ActionTarget;
  /** The error reference to quote (from the error log). Without it there is no copy button. */
  reference?: string;
  /** Label of the copy button. Default: Copy reference <reference>. */
  copyLabel?: (reference: string) => string;
  /** Called after the reference was put on the clipboard, e.g. to show a toast. */
  onCopyReference?: (reference: string) => void;
}

/**
 * ErrorState: a request failed. Says what failed, keeps the page, and offers Retry and
 * Copy reference <id> (board `D-states`, "Error · the request failed"). Built from EmptyState.
 */
export const ErrorState = forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      title,
      description,
      action,
      reference,
      copyLabel = (ref) => `Copy reference ${ref}`,
      onCopyReference,
      ...props
    },
    ref,
  ) => {
    const copy = async () => {
      if (!reference) return;
      // A blocked clipboard is fine: the reference is still on screen to read out.
      await copyText(reference);
      onCopyReference?.(reference);
    };

    return (
      <EmptyState
        ref={ref}
        title={title}
        description={description}
        action={action}
        secondaryAction={reference ? { label: copyLabel(reference), onSelect: copy } : undefined}
        {...props}
      />
    );
  },
);

ErrorState.displayName = 'ErrorState';
