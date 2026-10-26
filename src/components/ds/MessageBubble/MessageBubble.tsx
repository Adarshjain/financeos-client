import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { Text } from '../Text/Text';

export interface MessageBubbleProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The message text. */
  children: React.ReactNode;
  /** Caption under the bubble, right-aligned (for example a time). */
  meta?: React.ReactNode;
}

/**
 * A sent message. Aligned to the end; the left padding step keeps it from ever spanning the column.
 * Server component, no hooks.
 */
export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  ({ children, meta, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col items-end gap-space-4 pl-space-64', className)}
      {...props}
    >
      <div className="bg-brand-tint rounded-ds-xl rounded-br-ds-xs px-space-14 py-space-10 text-body font-text text-ink min-w-0 break-words whitespace-pre-wrap">
        {children}
      </div>
      {meta ? (
        <Text variant="caption" className="text-ink-faint text-right">
          {meta}
        </Text>
      ) : null}
    </div>
  ),
);

MessageBubble.displayName = 'MessageBubble';
