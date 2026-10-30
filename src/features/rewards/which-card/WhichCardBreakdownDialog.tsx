'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { ProgressBar } from '@/components/ds/ProgressBar/ProgressBar';
import { StatusWords } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';

import type { Breakdown } from './whichCardModel';

/** One card's full breakdown, opened from its result row (state, not the address): each rule's outcome, cap headroom and milestone progress. */
export function WhichCardBreakdownDialog({ detail, onClose }: { detail: Breakdown; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content size="md" title={detail.title} primary={{ label: 'Close', onSelect: onClose }}>
        <Dialog.Body>
          <BreakdownContent detail={detail} />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}

/** The rule-by-rule outcome, cap headroom and milestone progress of one card: the body of the breakdown dialog, and of a rule test's result. */
export function BreakdownContent({ detail }: { detail: Breakdown }) {
  return (
    <>
          <Card>
            {detail.summary.map((row) => (
              <ListRow
                key={row.label}
                title={row.label}
                trailing={<Text variant="body-strong">{row.value}</Text>}
              />
            ))}
          </Card>

          <div className="flex flex-col gap-space-8">
            <Text variant="overline" tone="ink-3" as="div">
              Rule breakdown
            </Text>
            <Card>
              {detail.lines.length === 0 ? (
                <ListRow title={<Text tone="ink-3">No rule lines match</Text>} />
              ) : (
                detail.lines.map((line) => (
                  <ListRow
                    key={line.key}
                    wrap
                    title={
                      <Text variant="body-strong">
                        {line.name}
                        {line.stacking ? ` · ${line.stacking}` : ''}
                      </Text>
                    }
                    subtitle={
                      <div className="flex flex-col gap-space-4">
                        <StatusWords prefix="Outcome" items={[line.outcome]} />
                        {line.cap ? (
                          <>
                            <Text variant="caption" tone="ink-3" as="div">
                              {line.cap.text}
                            </Text>
                            <ProgressBar
                              value={Math.max(0, line.cap.remaining)}
                              max={line.cap.total}
                              tone={line.cap.remaining <= 0 ? 'danger' : 'brand'}
                            />
                          </>
                        ) : null}
                      </div>
                    }
                    trailing={
                      <div className="flex flex-col items-end">
                        <Text variant="body-strong">{line.earned}</Text>
                        {line.earnedValue ? (
                          <Text variant="caption" tone="ink-3">
                            {line.earnedValue}
                          </Text>
                        ) : null}
                      </div>
                    }
                  />
                ))
              )}
            </Card>
          </div>

          {detail.milestones.length > 0 ? (
            <div className="flex flex-col gap-space-8">
              <Text variant="overline" tone="ink-3" as="div">
                Milestone progress and crossings
              </Text>
              <Card>
                {detail.milestones.map((m) => (
                  <ListRow
                    key={m.key}
                    wrap
                    title={<Text variant="body-strong">{m.name}</Text>}
                    subtitle={
                      <div className="flex flex-col gap-space-2">
                        <Text variant="caption" tone="ink-3" as="div">
                          {m.progress}
                        </Text>
                        <Text variant="caption" tone={m.crosses ? 'positive' : 'ink-3'} as="div">
                          {m.status}
                        </Text>
                      </div>
                    }
                    trailing={
                      <Text variant="body-strong" tone="positive">
                        {m.value}
                      </Text>
                    }
                  />
                ))}
              </Card>
            </div>
          ) : null}
    </>
  );
}
