import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { Icon } from '../Icon/Icon';

export interface StepperStep {
  id: string;
  label: React.ReactNode;
}

export interface StepperProps extends React.OlHTMLAttributes<HTMLOListElement> {
  steps: StepperStep[];
  /** Index of the current step (0-based); earlier steps are done, later ones upcoming. */
  current: number;
}

/**
 * Stepper: the steps of a multi-step flow and where the user is.
 * Progress only; the page's own buttons move between steps.
 */
export const Stepper = forwardRef<HTMLOListElement, StepperProps>(
  ({ steps, current, className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn('flex flex-wrap gap-x-space-16 gap-y-space-8', className)}
      {...props}
    >
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'upcoming';
        return (
          <li
            key={step.id}
            data-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
            className={cn(
              'flex items-center gap-space-8 font-text text-label font-bold whitespace-nowrap',
              state === 'current' ? 'text-positive-strong' : 'text-ink-3',
            )}
          >
            <span
              className={cn(
                'inline-flex size-space-24 shrink-0 items-center justify-center rounded-ds-pill text-caption font-bold tabular-nums',
                state === 'done' && 'bg-brand-tint text-brand',
                state === 'current' && 'bg-brand text-on-brand',
                state === 'upcoming' && 'bg-line-soft text-ink-3',
              )}
            >
              {state === 'done' ? <Icon name="check" size="sm" aria-hidden /> : index + 1}
            </span>
            {step.label}
          </li>
        );
      })}
    </ol>
  ),
);

Stepper.displayName = 'Stepper';
