'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Menu } from '@/components/ds/Menu/Menu';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { useAppRouter } from '@/lib/useAppRouter';

import { markMonthEmpty, unmarkMonthEmpty } from './coverageActions';
import {
  ACTION_LABEL,
  buildCoverageModel,
  type CellAction,
  type CellKind,
  type CoverageCell,
  type CoverageData,
} from './coverageModel';

const CELL_BASE = 'inline-flex items-center justify-center rounded-ds-xs border font-text';
const CELL_KIND: Record<CellKind, string> = {
  data: 'border-transparent bg-brand text-on-brand',
  empty: 'border-line-heavy bg-surface text-ink-3',
  fetching: 'border-dashed border-line-heavy bg-sunken text-ink-4',
  marked: 'border-transparent bg-line-soft text-ink-3',
};

/** One month: the cell is a button only when it offers actions. */
function Cell({
  cell,
  pending,
  onAction,
}: {
  cell: CoverageCell;
  pending: boolean;
  onAction: (cell: CoverageCell, action: CellAction) => void;
}) {
  const face = (
    <Text variant="caption" tone="ink" className="text-inherit">
      {cell.label}
    </Text>
  );
  const className = `${CELL_BASE} ${CELL_KIND[cell.kind]} w-space-40 h-space-32 shrink-0`;
  if (cell.actions.length === 0) {
    return (
      <span className={className} data-kind={cell.kind} data-month={cell.month}>
        {face}
      </span>
    );
  }
  return (
    <Menu
      contentProps={{ title: `${cell.label} ${cell.month.slice(0, 4)}` }}
      trigger={
        <button
          type="button"
          disabled={pending}
          aria-busy={pending || undefined}
          className={`${className} disabled:cursor-progress disabled:opacity-50 cursor-pointer hover:bg-hover active:bg-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring`}
          data-kind={cell.kind}
          data-month={cell.month}
        >
          {face}
        </button>
      }
    >
      {cell.actions.map((action) => (
        <Menu.Item key={action} onSelect={() => onAction(cell, action)}>
          {ACTION_LABEL[action]}
        </Menu.Item>
      ))}
    </Menu>
  );
}

/** The months this account has data for, oldest first, grouped by year; an empty month can be uploaded or marked empty. */
export function CoverageStrip({ accountId, coverage }: { accountId: string; coverage: CoverageData }) {
  const router = useAppRouter();
  const [navPending, startNav] = React.useTransition();
  // The pressed month, from the press until the refresh that shows its new state has landed (`done`: the request itself finished).
  const [active, setActive] = React.useState<{ month: string; done: boolean } | null>(null);
  React.useEffect(() => {
    if (active?.done && !navPending) setActive(null);
  }, [active, navPending]);
  const model = buildCoverageModel(coverage);

  const unmark = async (month: string, toast: string) => {
    if (active) return;
    setActive({ month, done: false });
    try {
      await unwrapAction(unmarkMonthEmpty(accountId, month));
      if (toast) showToast(toast);
      setActive({ month, done: true });
      startNav(() => router.refresh());
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't undo this. Try again."), { tone: 'danger' });
      setActive(null);
    }
  };

  const mark = async (month: string) => {
    if (active) return;
    setActive({ month, done: false });
    try {
      await unwrapAction(markMonthEmpty(accountId, month));
      showToast('Marked as nothing happened', { action: { label: 'Undo', onSelect: () => void unmark(month, '') } });
      setActive({ month, done: true });
      startNav(() => router.refresh());
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't mark this month. Try again."), { tone: 'danger' });
      setActive(null);
    }
  };

  const onAction = (cell: CoverageCell, action: CellAction) => {
    if (action === 'upload') router.push(`/transactions/import?account=${accountId}`);
    else if (action === 'mark-empty') void mark(cell.month);
    else void unmark(cell.month, 'Month reopened');
  };

  if (model.years.length === 0) return null;

  return (
    <Card title="Months covered">
      <div className="flex flex-col gap-space-12 px-space-16 pb-space-16">
        <div className="flex gap-space-16 overflow-x-auto max-w-full">
          {model.years.map((group) => (
            <div key={group.year} className="flex shrink-0 flex-col gap-space-4">
              <Text variant="caption" tone="ink-3">
                {group.year}
              </Text>
              <div className="flex gap-space-4">
                {group.cells.map((cell) => (
                  <Cell key={cell.month} cell={cell} pending={active?.month === cell.month} onAction={onAction} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-space-16">
          {model.legend.map((item) => (
            <div key={item.kind} className="flex items-center gap-space-6">
              <span className={`${CELL_BASE} ${CELL_KIND[item.kind]} w-space-12 h-space-12`} aria-hidden="true" />
              <Text variant="caption" tone="ink-3">
                {item.label}
              </Text>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
