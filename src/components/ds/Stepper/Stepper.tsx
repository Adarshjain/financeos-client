import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { Icon } from '../Icon/Icon';

export interface StepperStep {
  id: string;
  label: React.ReactNode;
}

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: StepperStep[];
  /** Index of the current step (0-based); earlier steps are done, later ones upcoming. */
  current: number;
  /** Phone caption above the current step's name. Default "Step 3 of 4". */
  stepLabel?: (step: number, total: number) => React.ReactNode;
}

type StepState = 'done' | 'current' | 'upcoming';

const stateOf = (index: number, current: number): StepState =>
  index < current ? 'done' : index === current ? 'current' : 'upcoming';

/**
 * Stepper: the steps of a multi-step flow and where the user is. Progress only;
 * the page's own buttons move between steps.
 * Desktop: numbered circles joined by a line that fills up to the current step.
 * Phone: "Step 3 of 4  Reconcile" on one line over a bar with one segment per step.
 */
export const Stepper = forwardRef<HTMLDivElement, StepperProps>(
  (
    {
      steps,
      current,
      stepLabel = (step, total) => `Step ${step} of ${total}`,
      className,
      ...props
    },
    ref,
  ) => {
    const total = steps.length;
    const shown = Math.min(Math.max(current, 0), total - 1);

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {/* Phone */}
        <div className="flex flex-col gap-space-8 lg:hidden">
          <p className="flex min-w-0 items-baseline gap-space-6 font-text">
            <span className="shrink-0 text-caption text-ink-3">{stepLabel(shown + 1, total)}</span>
            <span className="truncate text-body font-bold text-ink">{steps[shown]?.label}</span>
          </p>
          <div className="flex gap-space-4" aria-hidden>
            {steps.map((step, index) => (
              <span
                key={step.id}
                data-state={stateOf(index, current)}
                className={cn(
                  'h-space-4 flex-1 rounded-ds-pill',
                  index <= current ? 'bg-brand' : 'bg-line-soft',
                )}
              />
            ))}
          </div>
        </div>

        {/* Desktop */}
        <ol className="hidden items-center lg:flex">
          {steps.map((step, index) => {
            const state = stateOf(index, current);
            const isLast = index === total - 1;
            return (
              <li
                key={step.id}
                data-state={state}
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn('flex items-center', !isLast && 'flex-1')}
              >
                <span className="flex shrink-0 items-center gap-space-8">
                  <span
                    className={cn(
                      'inline-flex size-space-24 shrink-0 items-center justify-center rounded-ds-pill font-text text-caption font-bold tabular-nums',
                      state === 'done' && 'bg-brand text-on-brand',
                      state === 'current' && 'bg-brand text-on-brand ring-4 ring-brand-tint',
                      state === 'upcoming' && 'border border-line-strong bg-surface text-ink-3',
                    )}
                  >
                    {state === 'done' ? <Icon name="check" size="sm" aria-hidden /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      'whitespace-nowrap font-text text-label',
                      state === 'current' && 'font-bold text-ink',
                      state === 'done' && 'font-semibold text-ink-2',
                      state === 'upcoming' && 'font-semibold text-ink-3',
                    )}
                  >
                    {step.label}
                  </span>
                </span>
                {!isLast && (
                  <span
                    aria-hidden
                    className={cn(
                      'mx-space-12 h-px min-w-space-16 flex-1',
                      index < current ? 'bg-brand' : 'bg-line',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  },
);

Stepper.displayName = 'Stepper';
