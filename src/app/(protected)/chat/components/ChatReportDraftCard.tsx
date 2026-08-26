'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';

import {
  createReport,
  deleteReport,
  runAdHocReport,
  updateReport,
} from '@/actions/reports';
import { ReportDataView } from '@/components/reports/views/ReportDataView';
import { Button } from '@/components/ui/button';
import type {
  ReportData,
  ReportDefinition,
  ReportType,
} from '@/lib/reports.types';

export interface ChatReportDraft {
  mode: 'create' | 'update' | 'delete';
  name?: string;
  description?: string;
  type?: 'KPI' | 'CHART' | 'TABLE';
  datasource?: string;
  definition?: Record<string, unknown>;
  reportId?: string;
  status?: 'saved' | 'updated' | 'deleted' | 'failed';
  savedReportId?: string;
  errorMessage?: string;
}

interface ChatReportDraftCardProps {
  draft: ChatReportDraft;
  onStateChange: (state: {
    status: 'saved' | 'updated' | 'deleted' | 'failed';
    savedReportId?: string;
    errorMessage?: string;
  }) => void;
}

const PIXEL_DELAYS = [180, 360, 540, 0, 180, 360, 180, 360, 540];

function PixelGridLoader({ className }: { className?: string }) {
  return (
    <div
      className={`grid grid-cols-[repeat(3,4px)] gap-[1.5px] ${className || ''}`}
      aria-hidden="true"
    >
      {PIXEL_DELAYS.map((delay, i) => (
        <div
          key={i}
          className="size-[4px] rounded-[1px] bg-[var(--ink)] opacity-[0.15]"
          style={{
            animationName: 'bui-pixel-on',
            animationDuration: '1400ms',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay: `${delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function ChatReportDraftCard({
  draft,
  onStateChange,
}: ChatReportDraftCardProps) {
  const isDelete = draft?.mode === 'delete';
  const isCreate = draft?.mode === 'create';
  const isUpdate = draft?.mode === 'update';

  const isMalformed =
    !draft ||
    !draft.mode ||
    ((draft.mode === 'create' || draft.mode === 'update') &&
      (!draft.name || !draft.type || !draft.datasource || !draft.definition)) ||
    (draft.mode === 'delete' && !draft.reportId);

  const shouldFetchPreview =
    !isDelete &&
    !isMalformed &&
    Boolean(draft?.type && draft?.datasource && draft?.definition);

  const [previewData, setPreviewData] = useState<ReportData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(shouldFetchPreview);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [armed, setArmed] = useState(false);
  const disarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear arm timer on unmount
  useEffect(() => {
    return () => {
      if (disarmTimerRef.current) {
        clearTimeout(disarmTimerRef.current);
      }
    };
  }, []);

  // Live preview for create / update
  useEffect(() => {
    if (!shouldFetchPreview) return;

    let active = true;

    void runAdHocReport({
      type: draft.type as ReportType,
      datasource: draft.datasource!,
      definition: draft.definition as unknown as ReportDefinition,
    }).then((res) => {
      if (!active) return;
      setPreviewLoading(false);
      if (res.success) {
        setPreviewData(res.data);
        setPreviewError(null);
      } else {
        setPreviewData(null);
        setPreviewError(res.error.message);
      }
    });

    return () => {
      active = false;
    };
  }, [shouldFetchPreview, draft?.type, draft?.datasource, draft?.definition]);

  // Defensive validation against malformed drafts
  if (isMalformed) {
    return null;
  }

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const res = await createReport({
      name: draft.name!,
      description: draft.description || null,
      type: draft.type as ReportType,
      datasource: draft.datasource!,
      definition: draft.definition as unknown as ReportDefinition,
    });
    setIsSubmitting(false);
    if (res.success) {
      onStateChange({
        status: 'saved',
        savedReportId: res.data.id,
      });
    } else {
      onStateChange({
        status: 'failed',
        errorMessage: res.error.message,
      });
    }
  };

  const handleUpdate = async () => {
    if (isSubmitting || !draft.reportId) return;
    setIsSubmitting(true);
    const res = await updateReport(draft.reportId, {
      name: draft.name!,
      description: draft.description || null,
      definition: draft.definition as unknown as ReportDefinition,
    });
    setIsSubmitting(false);
    if (res.success) {
      onStateChange({
        status: 'updated',
        savedReportId: res.data.id ?? draft.reportId,
      });
    } else {
      onStateChange({
        status: 'failed',
        errorMessage: res.error.message,
      });
    }
  };

  const handleDeleteClick = () => {
    if (isSubmitting || !draft.reportId) return;
    if (!armed) {
      setArmed(true);
      if (disarmTimerRef.current) {
        clearTimeout(disarmTimerRef.current);
      }
      disarmTimerRef.current = setTimeout(() => {
        setArmed(false);
      }, 3000);
      return;
    }

    if (disarmTimerRef.current) {
      clearTimeout(disarmTimerRef.current);
    }
    setArmed(false);
    setIsSubmitting(true);

    void deleteReport(draft.reportId).then((res) => {
      setIsSubmitting(false);
      if (res.success) {
        onStateChange({
          status: 'deleted',
          savedReportId: draft.reportId,
        });
      } else {
        onStateChange({
          status: 'failed',
          errorMessage: res.error.message,
        });
      }
    });
  };

  const isTerminal =
    draft.status === 'saved' ||
    draft.status === 'updated' ||
    draft.status === 'deleted';

  return (
    <div className="rounded-[10px] bg-[var(--surface)] p-3 shadow-[var(--shadow-hairline)] space-y-2.5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`rounded px-1.5 py-0.5 text-2xs font-medium ${
                isDelete
                  ? 'text-rose-600 dark:text-rose-400 bg-[var(--field)]'
                  : 'text-[var(--ink-2)] bg-[var(--field)]'
              }`}
            >
              {isDelete ? 'DELETE' : draft.type}
            </span>
            <span className="text-xs font-semibold text-[var(--ink)] truncate">
              {draft.name || 'Untitled Report'}
            </span>
            {draft.datasource && (
              <span className="text-2xs text-[var(--ink-3)]">
                · {draft.datasource}
              </span>
            )}
          </div>
          {draft.description && (
            <p className="text-2xs text-[var(--ink-3)] line-clamp-2">
              {draft.description}
            </p>
          )}
        </div>
      </div>

      {/* Body: Live preview for create/update, warning for delete */}
      {isDelete ? (
        <div className="rounded-[8px] bg-rose-50/50 dark:bg-rose-950/30 p-2 text-2xs text-rose-600 dark:text-rose-400">
          This will permanently delete the report: {draft.name || 'this report'}.
        </div>
      ) : (
        <div>
          {previewLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-2xs text-[var(--ink-3)]">
              <PixelGridLoader />
              <span>Running preview…</span>
            </div>
          ) : previewError ? (
            <div className="rounded-[8px] bg-rose-50/50 dark:bg-rose-950/30 p-2 text-2xs text-rose-600 dark:text-rose-400">
              {previewError}
            </div>
          ) : previewData ? (
            <div className="max-h-72 overflow-y-auto rounded-[8px] bg-[var(--canvas)] p-2">
              <ReportDataView data={previewData} />
            </div>
          ) : null}
        </div>
      )}

      {/* Error state (non-terminal failure) */}
      {draft.status === 'failed' && draft.errorMessage && (
        <div className="text-2xs text-rose-600 dark:text-rose-400">
          {draft.errorMessage}
        </div>
      )}

      {/* Action / Confirmation row */}
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
            onClick={() => void handleSave()}
          >
            {isSubmitting ? 'Saving…' : 'Save report'}
          </Button>
        ) : isUpdate ? (
          <Button
            size="sm"
            variant="default"
            disabled={isSubmitting || previewLoading || Boolean(previewError)}
            onClick={() => void handleUpdate()}
          >
            {isSubmitting ? 'Updating…' : 'Update report'}
          </Button>
        ) : isDelete ? (
          <Button
            size="sm"
            variant="destructive"
            disabled={isSubmitting}
            onClick={handleDeleteClick}
          >
            {isSubmitting
              ? 'Deleting…'
              : armed
              ? 'Click again to delete'
              : 'Delete report'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
