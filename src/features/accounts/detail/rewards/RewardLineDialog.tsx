'use client';

import React from 'react';

import { Card, Dialog, DialogBody, DialogContent, ListRow, StatusWords, Text } from '@/components/ds';

import type { LineDetail } from './rewardsModel';

/** One earning line's computation, opened from the lines list (state, not the address). */
export function RewardLineDialog({ detail, onClose }: { detail: LineDetail; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent size="sm" title="Reward calculation" primary={{ label: 'Close', onSelect: onClose }}>
        <DialogBody>
          <div className="flex flex-col gap-space-2">
            <Text variant="body-strong" as="div">
              {detail.title}
            </Text>
            {detail.source ? (
              <Text variant="caption" tone="ink-3" as="div">
                {detail.source}
              </Text>
            ) : null}
          </div>
          <Card>
            {detail.rows.map((row) => (
              <ListRow key={row.label} title={row.label} trailing={<Text variant="body-strong">{row.value}</Text>} />
            ))}
          </Card>
          <div className="flex flex-col gap-space-2">
            <StatusWords items={[{ label: detail.reason.label, tone: detail.reason.tone }]} />
            <Text variant="caption" tone="ink-3" as="div">
              {detail.reason.explain}
            </Text>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
