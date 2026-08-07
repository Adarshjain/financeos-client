import { Textarea, type TextareaProps } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { Label } from './label';

interface FormFieldProps extends TextareaProps {
  label?: string;
  error?: string;
  hint?: string;
  inputClassName?: string;
}

export function FormFieldTextArea({
                                    label,
                                    error,
                                    hint,
                                    id,
                                    className,
                                    inputClassName,
                                    ...props
                                  }: FormFieldProps) {
  const fieldId = id || props.name;
  // See FormField: error/hint text needs to be programmatically associated with
  // the control, not merely rendered next to it.
  const errorId = fieldId ? `${fieldId}-error` : undefined;
  const hintId = fieldId ? `${fieldId}-hint` : undefined;
  const showHint = Boolean(hint) && !error;

  return (
    <div className={cn('space-y-1', className)}>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <Textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : showHint ? hintId : undefined}
        className={cn(
          inputClassName,
          error && 'border-red-300 dark:border-red-700 focus:ring-red-500',
        )}
        {...props}
      />
      {showHint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
