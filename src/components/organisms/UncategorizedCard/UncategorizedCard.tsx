'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { formatCount } from '@/lib/format';

export interface UncategorizedCardGroup {
  label: string;
  count: number;
}

export interface UncategorizedCardProps {
  /** How many transactions have no category. */
  count: number;
  /** How many groups of two or more they fall into (one-offs are not groups). */
  groupCount: number;
  /** The biggest groups, biggest first. */
  topGroups: UncategorizedCardGroup[];
  /** "Sort them" was pressed. */
  onSort?: () => void;
}

const verb = (n: number) => (n === 1 ? 'needs' : 'need');

/** The line under the title. Phone names the biggest group; desktop lists the top ones and "N more". Empty when there are no groups. */
function Lines({ groupCount, topGroups }: Pick<UncategorizedCardProps, 'groupCount' | 'topGroups'>) {
  const biggest = topGroups[0];
  if (groupCount === 0 || !biggest) return null;
  const listed = topGroups.slice(0, 3);
  const more = groupCount - listed.length;
  return (
    <>
      <span className="desk:hidden">
        In {formatCount(groupCount, ['group', 'groups'])}. The biggest is {biggest.label}, with {formatCount(biggest.count)}.
      </span>
      <span className="max-desk:hidden">
        {formatCount(groupCount, ['group', 'groups'])}: {listed.map((g) => `${g.label} (${formatCount(g.count)})`).join(', ')}
        {more > 0 ? ` and ${formatCount(more)} more` : ''}
      </span>
    </>
  );
}

/**
 * The Uncategorized card above the Transactions list: how many need a category, how they group, and "Sort them".
 * The page shows it only while something is uncategorized. Phone and desktop word it differently (CSS, one structure).
 */
export function UncategorizedCard({ count, groupCount, topGroups, onSort }: UncategorizedCardProps) {
  const title = (
    <>
      <span className="desk:hidden">
        {formatCount(count)} {verb(count)} a category
      </span>
      <span className="max-desk:hidden">
        {formatCount(count, ['transaction', 'transactions'])} {verb(count)} a category
      </span>
    </>
  );
  const subtitle = groupCount > 0 && topGroups.length > 0 ? <Lines groupCount={groupCount} topGroups={topGroups} /> : undefined;
  return (
    <Card title={title} subtitle={subtitle}>
      <div className="px-space-16 pb-space-14">
        <Button variant="primary" onClick={onSort}>
          Sort them
        </Button>
      </div>
    </Card>
  );
}
