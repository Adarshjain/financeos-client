'use client';

import { Card, Dialog, DialogBody, DialogContent, ListRow, SectionHeader, Text } from '@/components/ds';

import type { ReviewSummary } from './useApproveTransactions';

export interface ReviewSummaryDialogProps {
  /** The result of an approve run; the dialog is open while this is set. */
  summary: ReviewSummary | null;
  onClose: () => void;
}

/** What an approve run did, shown only when something was skipped or failed (Legacy batch summary). */
export function ReviewSummaryDialog({ summary, onClose }: ReviewSummaryDialogProps) {
  return (
    <Dialog open={summary !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="sm"
        title="Approve summary"
        description="The batch finished with these results."
        primary={{ label: 'Close', onSelect: onClose }}
      >
        <DialogBody>
          {summary ? (
            <div className="flex flex-col gap-space-16">
              <Card>
                <ListRow title="Approved" trailing={<Text as="span">{summary.succeededCount}</Text>} />
                <ListRow
                  title="Skipped"
                  subtitle="No ticked reason on that row"
                  trailing={<Text as="span">{summary.skippedCount}</Text>}
                />
                <ListRow title="Failed" trailing={<Text as="span">{summary.failures.length}</Text>} />
              </Card>
              {summary.skips.length > 0 ? (
                <section>
                  <SectionHeader variant="band">Skipped rows</SectionHeader>
                  <Card>
                    {summary.skips.map((description, i) => (
                      <ListRow key={i} wrap title={description} />
                    ))}
                  </Card>
                </section>
              ) : null}
              {summary.failures.length > 0 ? (
                <section>
                  <SectionHeader variant="band" tone="danger">Failed rows</SectionHeader>
                  <Card>
                    {summary.failures.map((f, i) => (
                      <ListRow key={i} wrap title={f.description} subtitle={f.reason} />
                    ))}
                  </Card>
                </section>
              ) : null}
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
