'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import React from 'react';

import { Banner, Button, Card, ConfirmDialog, showToast, Skeleton, Text } from '@/components/ds';
import { useReportCatalog } from '@/features/dashboards/frame/useReportCatalog';
import { workingCatalog } from '@/features/reports/builder/editorStateModel';
import { ReportResult } from '@/features/reports/view/ReportResult';
import { appHref } from '@/features/shell/routes';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage'; // Exception: draftActions.ts writes through the browser client (see its note), so a gone report arrives as an ApiError.
import { formatCount } from '@/lib/format';
import { storeSavedDashboard,useDashboards } from '@/lib/query/hooks/useDashboards';
import { keys } from '@/lib/query/keys';
import type { ReportData, ReportResponse } from '@/lib/reports.types';

import type { ChatReportDraft } from './chat.types';
import type { DraftResult } from './conversation.types';
import { saveDraftResult } from './conversationActions';
import {
  addReportWidget,
  applyDraftUpdate,
  createHomeWithReport,
  getReport,
  getReportSummary,
  removeDashboard,
  removeReport,
  removeWidgetFrom,
  restoreReport,
  runDraftPreview,
  saveDraftAsReport,
} from './draftActions';
import { activeResult, draftCaption, isMalformedDraft } from './draftModel';

export interface ChatReportDraftCardProps {
  draft: ChatReportDraft;
  /** What happened to the draft when the conversation was last open. */
  draftResult?: DraftResult | null;
  conversationId: string | null;
  messageId?: string;
}

/** Something already gone (a 404) is as good as removed: Undo has nothing left to do for it. */
function ignoreGone(e: unknown): null {
  if (e instanceof ApiError && e.status === 404) return null;
  throw e;
}

const UNDO_KEY = ['chat-draft', 'undo'];

/** A report the assistant drafted: preview, then save, add to Home, update or delete, with the outcome kept in the chat. */
export function ChatReportDraftCard({ draft, draftResult, conversationId, messageId }: ChatReportDraftCardProps) {
  const queryClient = useQueryClient();
  const dashboards = useDashboards();
  const home = dashboards.data?.find((d) => d.isDefault);
  // Field labels and number formats, as the report editor and dashboard widgets show them.
  const catalog = useReportCatalog();
  const datasourceCatalog = React.useMemo(
    () => (catalog.data && draft.datasource ? workingCatalog(catalog.data, draft.datasource) : undefined),
    [catalog.data, draft.datasource],
  );

  const [result, setResult] = React.useState<DraftResult | null>(activeResult(draftResult));
  const [error, setError] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  // The report as it was before this card updated it: what Undo puts back (kept for this visit only).
  const [previous, setPrevious] = React.useState<ReportResponse | null>(null);
  const [dashboardCount, setDashboardCount] = React.useState<number | null>(null);
  const [deleteName, setDeleteName] = React.useState<string | null>(null);

  const isCreate = draft.mode === 'create';
  const isUpdate = draft.mode === 'update';
  const isDelete = draft.mode === 'delete';
  const malformed = isMalformedDraft(draft);

  // The live preview of a create or update; the effect is keyed on the draft's content, not its identity.
  const [preview, setPreview] = React.useState<{ data: ReportData | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: !isDelete && !malformed });
  const [previewTry, setPreviewTry] = React.useState(0);
  const draftKey = JSON.stringify([draft.type, draft.datasource, draft.definition]);
  React.useEffect(() => {
    if (isDelete || malformed) return;
    let active = true;
    setPreview((p) => ({ data: p.data, error: null, loading: true }));
    const [type, datasource, definition] = JSON.parse(draftKey) as [ChatReportDraft['type'], ChatReportDraft['datasource'], ChatReportDraft['definition']];
    runDraftPreview({ mode: 'create', type, datasource, definition }).then(
      (data) => {
        if (active) setPreview({ data, error: null, loading: false });
      },
      () => {
        if (active) setPreview({ data: null, error: "Couldn't load the preview.", loading: false });
      },
    );
    return () => {
      active = false;
    };
  }, [isDelete, malformed, draftKey, previewTry]);

  // A delete says how many dashboards its widget leaves.
  React.useEffect(() => {
    if (!isDelete || malformed || result) return;
    let active = true;
    void getReportSummary(draft.reportId!).then((r) => {
      if (!active || !r) return;
      setDashboardCount(r.dashboards.length);
      setDeleteName(r.name);
    }).catch(() => undefined); // Only the delete dialog's extra detail; Delete works without it.
    return () => {
      active = false;
    };
  }, [isDelete, malformed, result, draft.reportId]);

  // A deleted or removed report takes its widget with it, so the dashboards refetch too.
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keys.reports.all });
    void queryClient.invalidateQueries({ queryKey: keys.dashboards.all });
  };
  const remember = (next: DraftResult) => {
    if (!conversationId || !messageId) return;
    const lost = () => showToast("Couldn't save this in the chat. After a reload the draft may show its actions again.", { tone: 'danger' });
    saveDraftResult(conversationId, messageId, next).then((res) => (res.success ? undefined : lost()), lost);
  };
  const finish = (next: DraftResult) => {
    setResult(next);
    remember(next);
    refresh();
  };
  const undone = () => {
    setResult(null);
    setPrevious(null);
    remember({ action: 'undone' });
    refresh();
  };
  const undoMutation = useMutation({
    mutationKey: UNDO_KEY,
    mutationFn: async ({ done, before }: { done: DraftResult; before: ReportResponse | null }) => {
      if (done.action === 'saved-home' && done.createdDashboard && done.dashboardId) {
        await removeDashboard(done.dashboardId).catch(ignoreGone);
      } else if (done.action === 'saved-home' && done.dashboardId && done.widgetId) {
        const saved = await removeWidgetFrom(done.dashboardId, done.widgetId).catch(ignoreGone);
        if (saved) storeSavedDashboard(queryClient, saved);
      }
      if ((done.action === 'saved' || done.action === 'saved-home') && done.reportId) await removeReport(done.reportId).catch(ignoreGone);
      if (done.action === 'updated' && before) await restoreReport(before);
    },
    onSuccess: undone,
    onError: (e) => showToast(getErrorMessage(e, "Couldn't undo. Try again."), { tone: 'danger' }),
  });
  const undo = (done: DraftResult, before: ReportResponse | null) => {
    // Asked of the cache, not of this render: the toast's Undo outlives the render that made it.
    if (queryClient.isMutating({ mutationKey: UNDO_KEY }) > 0) return;
    setError(null);
    undoMutation.mutate({ done, before });
  };

  const saveMutation = useMutation({
    mutationFn: async (toHome: boolean) => {
      const report = await saveDraftAsReport(draft);
      let done: DraftResult = { action: 'saved', reportId: report.id, reportName: report.name };
      if (toHome) {
        try {
          const { saved, widgetId } = home ? await addReportWidget(home.id, report) : await createHomeWithReport(report);
          storeSavedDashboard(queryClient, saved);
          done = { action: 'saved-home', reportId: report.id, reportName: report.name, widgetId, dashboardId: saved.id ?? home?.id, ...(home ? {} : { createdDashboard: true }) };
        } catch {
          showToast("Report saved, but couldn't add it to Home.", { tone: 'danger' });
        }
      }
      return done;
    },
    onSuccess: (done) => {
      finish(done);
      showToast(done.action === 'saved-home' ? 'Report saved and added to Home' : 'Report saved', {
        action: { label: 'Undo', onSelect: () => undo(done, null) },
      });
    },
    onError: (e) => setError(getErrorMessage(e, "Couldn't save the report. Try again.")),
  });
  const save = (toHome: boolean) => {
    if (busy) return;
    setError(null);
    saveMutation.mutate(toHome);
  };

  const updateMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const before = await getReport(reportId);
      await applyDraftUpdate(reportId, draft);
      return { before, done: { action: 'updated', reportId, reportName: draft.name } as DraftResult };
    },
    onSuccess: ({ before, done }) => {
      setPrevious(before);
      finish(done);
      showToast('Report updated', { action: { label: 'Undo', onSelect: () => undo(done, before) } });
    },
    onError: (e) => setError(getErrorMessage(e, "Couldn't update the report. Try again.")),
  });
  const update = () => {
    if (busy || !draft.reportId) return;
    setError(null);
    updateMutation.mutate(draft.reportId);
  };

  const removeMutation = useMutation({
    mutationFn: (reportId: string) => removeReport(reportId),
    onSuccess: (_data, reportId) => {
      setConfirming(false);
      finish({ action: 'deleted', reportId, reportName: draft.name ?? deleteName ?? undefined });
    },
    onError: (e) => {
      setConfirming(false);
      setError(getErrorMessage(e, "Couldn't delete the report. Try again."));
    },
  });
  const busy = saveMutation.isPending
    ? saveMutation.variables
      ? 'home'
      : 'save'
    : updateMutation.isPending
      ? 'update'
      : removeMutation.isPending
        ? 'delete'
        : undoMutation.isPending
          ? 'undo'
          : null;

  const remove = () => {
    if (busy || !draft.reportId) return;
    setError(null);
    removeMutation.mutate(draft.reportId);
  };

  if (malformed) return null;

  const title = draft.name ?? deleteName ?? 'this report';
  const overline = isDelete ? 'Delete report' : isUpdate ? 'Change to your report' : 'Report draft';
  const caption = isDelete
    ? dashboardCount ? `It is on ${formatCount(dashboardCount, ['dashboard', 'dashboards'])}. Its widget goes with it.` : null
    : draftCaption(draft);
  const previewBlocks = Boolean(preview.error || preview.loading);
  const reportHref = result?.reportId ? appHref(`/reports/${result.reportId}`) : null;
  const openReport = reportHref ? (
    <Text variant="label" as="span">
      <Button variant="link" size="sm" asChild>
        <Link href={reportHref} prefetch={false}>
          Open report
        </Link>
      </Button>
    </Text>
  ) : null;
  const canUndo = result && (result.action === 'saved' || result.action === 'saved-home' || (result.action === 'updated' && previous));

  return (
    <>
      <Card>
        <Card.Header>
          <div className="flex min-w-0 flex-col gap-space-2">
            <Text variant="overline" tone="ink-3" as="p">
              {overline}
            </Text>
            <Text variant="heading" as="h3">
              {title}
            </Text>
            {caption ? (
              <Text variant="label" tone="ink-3" as="p">
                {caption}
              </Text>
            ) : null}
          </div>
        </Card.Header>

        {!isDelete ? (
          <Card.Row className="block">
            {/* Wait for the catalog (or its failure) too, rather than flash raw field names. */}
            {preview.loading || (preview.data && catalog.isPending) ? <Skeleton height={160} /> : null}
            {preview.error ? <Banner tone="danger" action={{ label: 'Retry', onSelect: () => setPreviewTry((n) => n + 1) }}>{preview.error}</Banner> : null}
            {preview.data && !catalog.isPending ? <ReportResult data={preview.data} catalog={datasourceCatalog} /> : null}
          </Card.Row>
        ) : null}

        {error ? (
          <Card.Row className="block">
            <Banner tone="danger">{error}</Banner>
          </Card.Row>
        ) : null}

        {result ? (
          <Card.Footer>
            <Text variant="label" tone="ink-3" as="span">
              {result.action === 'saved-home'
                ? 'Report saved and added to Home'
                : result.action === 'saved'
                  ? 'Report saved'
                  : result.action === 'updated'
                    ? 'Report updated'
                    : 'Report deleted'}
              {openReport ? <> · {openReport}</> : null}
            </Text>
            {canUndo ? (
              <Text variant="label" as="span">
                <Button variant="link" size="sm" loading={busy === 'undo'} onClick={() => undo(result, previous)}>
                  Undo
                </Button>
              </Text>
            ) : null}
          </Card.Footer>
        ) : (
          <Card.Footer className="justify-end">
            {isUpdate ? (
              <Text variant="label" tone="ink-3" as="span" className="mr-auto">
                {`Updates “${title}”`}
              </Text>
            ) : null}
            {isCreate ? (
              // Off until the dashboards list is in: before that "no default" can't be told apart, and a second Home would be made.
              <Button variant="secondary" size="sm" loading={busy === 'home'} disabled={Boolean(busy) || previewBlocks || !dashboards.isSuccess} onClick={() => save(true)}>
                Add to Home
              </Button>
            ) : null}
            {isCreate ? (
              <Button variant="primary" size="sm" loading={busy === 'save'} disabled={Boolean(busy) || previewBlocks} onClick={() => save(false)}>
                Save as report
              </Button>
            ) : null}
            {isUpdate ? (
              <Button variant="primary" size="sm" loading={busy === 'update'} disabled={Boolean(busy) || previewBlocks} onClick={() => update()}>
                Update report
              </Button>
            ) : null}
            {isDelete ? (
              <Button variant="danger" size="sm" disabled={Boolean(busy)} onClick={() => setConfirming(true)}>
                Delete report
              </Button>
            ) : null}
          </Card.Footer>
        )}
      </Card>

      {confirming ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && busy !== 'delete') setConfirming(false);
          }}
          title={`Delete “${title}”?`}
          description="The report and its widget on Home go. Your transactions stay. This can't be undone."
          confirmLabel="Delete"
          confirmLoading={busy === 'delete'}
          onConfirm={() => remove()}
        />
      ) : null}
    </>
  );
}
