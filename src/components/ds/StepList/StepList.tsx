'use client';

import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { Text } from '../Text/Text';
import { useControllableState } from '../useControllableState';

export type StepState = 'done' | 'running' | 'failed';

export interface StepListStep {
  id: string;
  label: React.ReactNode;
  meta?: React.ReactNode;
  state: StepState;
  /** Card variant: caption under the label. */
  detail?: React.ReactNode;
  /** Card variant: shown in a sunken box behind a toggle. */
  code?: string;
}

export interface StepListProps {
  steps: StepListStep[];
  variant: 'live' | 'card';
  showCodeLabel?: React.ReactNode;
  hideCodeLabel?: React.ReactNode;
  /** Ids of the steps whose code is open. */
  openIds?: string[];
  defaultOpenIds?: string[];
  onOpenIdsChange?: (ids: string[]) => void;
  className?: string;
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'running') {
    return <Icon name="spinner" size="sm" className="animate-spin text-ink-3" />;
  }
  if (state === 'failed') {
    return <Icon name="warning" size="sm" className="text-danger" />;
  }
  return <Icon name="check" size="sm" className="text-ink-3" />;
}

export const StepList = forwardRef<HTMLUListElement, StepListProps>(
  (
    {
      steps,
      variant,
      showCodeLabel = 'Show details',
      hideCodeLabel = 'Hide details',
      openIds: openIdsProp,
      defaultOpenIds = [],
      onOpenIdsChange,
      className,
    },
    ref,
  ) => {
    const [openIds, setOpenIds] = useControllableState<string[]>({
      value: openIdsProp,
      defaultValue: defaultOpenIds,
      onChange: onOpenIdsChange,
    });

    const toggle = (id: string) =>
      setOpenIds(openIds.includes(id) ? openIds.filter((x) => x !== id) : [...openIds, id]);

    if (variant === 'live') {
      return (
        <ul ref={ref} className={cn('flex flex-col gap-space-6 font-text', className)}>
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-space-8 min-w-0">
              <StepIcon state={step.state} />
              <Text
                variant={step.state === 'running' ? 'body-strong' : 'body'}
                tone={step.state === 'failed' ? 'danger' : step.state === 'running' ? 'ink' : 'ink-2'}
              >
                {step.label}
              </Text>
              {step.meta ? (
                <Text variant="caption" className="text-ink-faint">
                  {step.meta}
                </Text>
              ) : null}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <ul
        ref={ref}
        className={cn(
          'bg-surface border border-line rounded-ds-lg overflow-clip divide-y divide-line-soft font-text',
          className,
        )}
      >
        {steps.map((step) => {
          const open = openIds.includes(step.id);
          return (
            <li key={step.id} className="flex items-start gap-space-10 px-space-14 py-space-10">
              <span className="flex items-center h-space-20 shrink-0">
                <StepIcon state={step.state} />
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-space-4">
                <div className="flex items-baseline justify-between gap-space-10">
                  <Text
                    variant={step.state === 'running' ? 'body-strong' : 'body'}
                    tone={step.state === 'failed' ? 'danger' : step.state === 'running' ? 'ink' : 'ink-2'}
                  >
                    {step.label}
                  </Text>
                  {step.meta ? (
                    <Text variant="caption" className="text-ink-faint text-right shrink-0">
                      {step.meta}
                    </Text>
                  ) : null}
                </div>
                {step.detail ? (
                  <Text variant="caption" tone="ink-3">
                    {step.detail}
                  </Text>
                ) : null}
                {step.code ? (
                  <>
                    <div>
                      <Button type="button" variant="link" size="sm" onClick={() => toggle(step.id)}>
                        {open ? hideCodeLabel : showCodeLabel}
                      </Button>
                    </div>
                    {open ? (
                      <pre className="bg-sunken rounded-ds-md p-space-10 font-mono text-caption text-ink-2 overflow-x-auto whitespace-pre-wrap break-words">
                        {step.code}
                      </pre>
                    ) : null}
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    );
  },
);

StepList.displayName = 'StepList';
