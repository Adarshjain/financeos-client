'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { ChatReportDraft } from './ChatReportDraftCard';

interface DraftActionsProps {
  draft: ChatReportDraft;
  isTerminal: boolean;
  isCreate: boolean;
  isUpdate: boolean;
  isDelete: boolean;
  isSubmitting: boolean;
  previewLoading: boolean;
  previewError: string | null;
  armed: boolean;
  onSave: () => void;
  onUpdate: () => void;
  onDeleteClick: () => void;
}

export function DraftActions({
  draft,
  isTerminal,
  isCreate,
  isUpdate,
  isDelete,
  isSubmitting,
  previewLoading,
  previewError,
  armed,
  onSave,
  onUpdate,
  onDeleteClick,
}: DraftActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      {isTerminal ? (
        <div className="flex items-center gap-2">
          <span className="text-2xs font-medium text-emerald-600 dark:text-emerald-400">
            {draft.status === 'saved'
              ? 'Saved ✓'
              : draft.status === 'updated'
              ? 'Updated ✓'
              : 'Deleted ✓'}
          </span>
          {(draft.status === 'saved' || draft.status === 'updated') &&
            (draft.savedReportId || draft.reportId) && (
              <Link
                href={`/reports/${draft.savedReportId || draft.reportId}`}
                className="text-2xs underline text-[var(--ink-2)] hover:text-[var(--ink)]"
              >
                View report
              </Link>
            )}
        </div>
      ) : isCreate ? (
        <Button
          size="sm"
          variant="default"
          disabled={isSubmitting || previewLoading || Boolean(previewError)}
          onClick={onSave}
        >
          {isSubmitting ? 'Saving…' : 'Save report'}
        </Button>
      ) : isUpdate ? (
        <Button
          size="sm"
          variant="default"
          disabled={isSubmitting || previewLoading || Boolean(previewError)}
          onClick={onUpdate}
        >
          {isSubmitting ? 'Updating…' : 'Update report'}
        </Button>
      ) : isDelete ? (
        <Button
          size="sm"
          variant="destructive"
          disabled={isSubmitting}
          onClick={onDeleteClick}
        >
          {isSubmitting
            ? 'Deleting…'
            : armed
            ? 'Click again to delete'
            : 'Delete report'}
        </Button>
      ) : null}
    </div>
  );
}
