import * as React from 'react';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { Label } from './label';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function FormFieldTextArea({
                                    label,
                                    error,
                                    hint,
                                    id,
                                    className,
                                    ...props
                                  }: FormFieldProps) {
  const fieldId = id || props.name;

  return (
    <div className={cn('space-y-1', className)}>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <Textarea
        id={fieldId}
        className={cn(
          error && 'border-red-300 dark:border-red-700 focus:ring-red-500',
        )}
        {...props}
      />
      {hint && !error && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
