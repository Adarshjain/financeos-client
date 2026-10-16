import React from 'react';

import { cn } from './cn';

export interface FieldFrameProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  id?: string;
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
          <label
            htmlFor={id}
            id={labelId}
            className="block font-text font-bold text-label text-ink-2 mb-space-6 select-none"
          >
            {label}
            {optional ? (
              <span className="font-medium text-ink-4 ml-space-4">
                (Optional)
              </span>
            ) : null}
          </label>
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
