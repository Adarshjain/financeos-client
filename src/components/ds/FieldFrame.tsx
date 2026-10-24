import React from 'react';

import { cn } from './cn';
import { Text } from './Text/Text';

export interface FieldFrameProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  id?: string;
  /** Id of the label text; the control points at it with aria-labelledby */
  labelId?: string;
  helperId?: string;
  label?: React.ReactNode;
  optional?: boolean;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const FieldFrame = React.forwardRef<HTMLDivElement, FieldFrameProps>(
  function FieldFrame(
    {
      id,
      labelId,
      helperId,
      label,
      optional = false,
      helper,
      error,
      className,
      children,
      ...props
    },
    ref,
  ) {
    const hasError = Boolean(error);

    return (
      <div
        ref={ref}
        className={cn('w-full font-text text-body', className)}
        {...props}
      >
        {label ? (
          // Plain text, not a <label>: tapping a label must not focus or open the control. The control links to it with aria-labelledby.
          <Text
            as="div"
            id={labelId}
            variant="label"
            tone="ink-2"
            className="block font-text font-bold mb-space-6 select-none"
          >
            {label}
            {optional ? (
              <span className="font-medium text-ink-4 ml-space-4">
                (Optional)
              </span>
            ) : null}
          </Text>
        ) : null}

        {children}

        {hasError ? (
          <div
            id={helperId}
            className="mt-space-6 font-text font-medium text-caption text-danger"
          >
            {error}
          </div>
        ) : helper ? (
          <div
            id={helperId}
            className="mt-space-6 font-text font-medium text-caption text-ink-3"
          >
            {helper}
          </div>
        ) : null}
      </div>
    );
  },
);

FieldFrame.displayName = 'FieldFrame';
