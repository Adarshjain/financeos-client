'use client';

// The few pieces every built-in body draws, composed only from Dinero components: the failed state, a
// muted note, a list row with a progress bar, the pager under a list, and the loading rows.

import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Pager } from '@/components/ds/Pager/Pager';
import { ProgressBar, type ProgressBarTone } from '@/components/ds/ProgressBar/ProgressBar';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
import type { TablePage } from '@/lib/reports.types';

/** The failed state, as Widget draws it: what failed, then the way forward. */
export function BuiltinError({ message, action }: { message: React.ReactNode; action?: { label: string; onSelect: () => void } }) {
  return (
    <div role="alert" className="flex flex-col gap-space-2">
      <Text variant="label" tone="danger" as="p">
        <strong>Couldn&apos;t load this widget</strong>
      </Text>
      <Text variant="caption" tone="ink-3" as="p">
        {message}
        {action ? (
          <>
            {' '}
            <Button variant="link" size="sm" onClick={action.onSelect}>
              {action.label}
            </Button>
          </>
        ) : null}
      </Text>
    </div>
  );
}

/** A muted line: an empty list, an unavailable account. */
export function BuiltinNote({ children, ...props }: { children: React.ReactNode } & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <Text variant="caption" tone="ink-3" as="p" {...props}>
      {children}
    </Text>
  );
}

export type BarRowTone = ProgressBarTone;

export interface BarRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  /** The figure at the end of the row ("46.0%"). */
  trailing: React.ReactNode;
  /** What the bar stands for, under the title. */
  caption?: React.ReactNode;
  /** 0–100; clamped. */
  value: number;
  tone?: BarRowTone;
  /** A row that opens a page is a link. */
  href?: string;
}

/** A row with a title, a figure, a progress bar and a caption: card utilisation, milestones, caps. */
export function BarRow({ title, trailing, caption, value, tone = 'brand', href, ...props }: BarRowProps) {
  const bar = (
    <div className="flex flex-col gap-space-4 mt-space-4">
      <ProgressBar value={Math.min(100, Math.max(0, value))} tone={tone} />
      {caption ? (
        <Text variant="caption" tone="ink-3" as="div">
          {caption}
        </Text>
      ) : null}
    </div>
  );
  if (href) {
    return (
      <ListRow asChild wrap title={title} trailing={trailing} {...props}>
        <Link href={href} prefetch={false}>
          {bar}
        </Link>
      </ListRow>
    );
  }
  return (
    <ListRow wrap title={title} trailing={trailing} {...props}>
      {bar}
    </ListRow>
  );
}

/** The pager under a list view, only when the rows span more than one page. */
export function BuiltinPager({
  page,
  unit,
  onPageChange,
}: {
  page: TablePage;
  unit: string;
  onPageChange: (page: number) => void;
}) {
  if (page.totalPages <= 1) return null;
  return (
    <Pager
      variant="compact"
      page={page.number}
      size={page.size}
      totalElements={page.totalElements}
      totalPages={page.totalPages}
      unit={`${unit}s`}
      borderPosition="top"
      onPageChange={onPageChange}
    />
  );
}

/** Loading rows: a title bar over a thin bar (`bar`), or a single line, with a figure at the end. */
export function RowsSkeleton({ rows = 3, bar = false }: { rows?: number; bar?: boolean }) {
  return (
    <div data-testid="widget-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-space-12 px-space-16 py-space-10">
          <div className="flex flex-1 flex-col gap-space-6">
            <Skeleton width="60%" height={14} />
            {bar ? <Skeleton height={6} /> : <Skeleton width="40%" height={12} />}
          </div>
          <Skeleton width={48} height={14} />
        </div>
      ))}
    </div>
  );
}

/** Loading figure: a big number and the line under it. */
export function FigureSkeleton() {
  return (
    <div className="flex flex-col gap-space-8" data-testid="widget-skeleton">
      <Skeleton width="70%" height={22} />
      <Skeleton width="50%" height={14} />
    </div>
  );
}
