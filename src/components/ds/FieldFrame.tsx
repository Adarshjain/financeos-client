import React from 'react';

import { cn } from './cn';

export interface FieldFrameProps {
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

export function FieldFrame({
  id,
  labelId,
  helperId,
  label,
  optional = false,
  helper,
  error,
  className,
  children,
}: FieldFrameProps) {
  const hasError = Boolean(error);

  return (
    <div className={cn('w-full font-text text-body', className)}>
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
}
