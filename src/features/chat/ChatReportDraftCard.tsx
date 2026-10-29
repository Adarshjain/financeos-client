'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import React from 'react';

import { Banner, Button, Card, CardFooter, CardHeader, CardRow, ConfirmDialog, showToast, Skeleton, Text } from '@/components/ds';
import { useReportCatalog } from '@/features/dashboards/frame/useReportCatalog';
import { workingCatalog } from '@/features/reports/builder/editorState';
import { ReportResult } from '@/features/reports/view/ReportResult';
import { appHref } from '@/features/shell/routes';
import { ApiError } from '@/lib/api/client';
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

const messageOf = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

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
  const [busy, setBusy] = React.useState<'save' | 'home' | 'update' | 'delete' | 'undo' | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const busyRef = React.useRef(false);
  const setBusyTo = (next: typeof busy) => {
    busyRef.current = next !== null;
    setBusy(next);
  };
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
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isDelete, malformed, result, draft.reportId]);

  if (malformed) return null;

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
  const fail = (e: unknown, fallback: string) => {
    setError(messageOf(e, fallback));
    setBusyTo(null);
  };

  const undo = async (done: DraftResult, before: ReportResponse | null) => {
    if (busyRef.current) return;
    setBusyTo('undo');
    setError(null);
    try {
      if (done.action === 'saved-home' && done.createdDashboard && done.dashboardId) {
        await removeDashboard(done.dashboardId).catch(ignoreGone);
      } else if (done.action === 'saved-home' && done.dashboardId && done.widgetId) {
        const saved = await removeWidgetFrom(done.dashboardId, done.widgetId).catch(ignoreGone);
        if (saved) storeSavedDashboard(queryClient, saved);
      }
      if ((done.action === 'saved' || done.action === 'saved-home') && done.reportId) await removeReport(done.reportId).catch(ignoreGone);
      if (done.action === 'updated' && before) await restoreReport(before);
      undone();
    } catch (e) {
      showToast(messageOf(e, "Couldn't undo. Try again."), { tone: 'danger' });
    }
    setBusyTo(null);
  };

  const save = async (toHome: boolean) => {
    if (busy) return;
    setBusyTo(toHome ? 'home' : 'save');
    setError(null);
    let report: ReportResponse;
    try {
      report = await saveDraftAsReport(draft);
    } catch (e) {
      return fail(e, "Couldn't save the report. Try again.");
    }
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
    finish(done);
    setBusyTo(null);
    showToast(done.action === 'saved-home' ? 'Report saved and added to Home' : 'Report saved', {
      action: { label: 'Undo', onSelect: () => void undo(done, null) },
    });
  };

  const update = async () => {
    if (busy || !draft.reportId) return;
    setBusyTo('update');
    setError(null);
    try {
      const before = await getReport(draft.reportId);
      await applyDraftUpdate(draft.reportId, draft);
      const done: DraftResult = { action: 'updated', reportId: draft.reportId, reportName: draft.name };
      setPrevious(before);
      finish(done);
      showToast('Report updated', { action: { label: 'Undo', onSelect: () => void undo(done, before) } });
    } catch (e) {
      return fail(e, "Couldn't update the report. Try again.");
    }
    setBusyTo(null);
  };

  const remove = async () => {
    if (busy || !draft.reportId) return;
    setBusyTo('delete');
    setError(null);
    try {
      await removeReport(draft.reportId);
      setConfirming(false);
      finish({ action: 'deleted', reportId: draft.reportId, reportName: draft.name ?? deleteName ?? undefined });
    } catch (e) {
      setConfirming(false);
      return fail(e, "Couldn't delete the report. Try again.");
    }
    setBusyTo(null);
  };

  const title = draft.name ?? deleteName ?? 'this report';
  const overline = isDelete ? 'Delete report' : isUpdate ? 'Change to your report' : 'Report draft';
  const caption = isDelete
    ? dashboardCount ? `It is on ${formatCount(dashboardCount, ['dashboard', 'dashboards'])}. Its widget goes with it.` : null
    : draftCaption(draft);
  const previewBlocks = Boolean(preview.error || preview.loading);
  const reportHref = result?.reportId ? appHref(`/reports/${result.reportId}`) : null;
  const openReport = reportHref ? (
    <Text variant="label" as="span">
      <Button variant="link" asChild>
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
        <CardHeader>
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
        </CardHeader>

        {!isDelete ? (
          <CardRow className="block">
            {/* Wait for the catalog (or its failure) too, rather than flash raw field names. */}
            {preview.loading || (preview.data && catalog.isPending) ? <Skeleton height={160} /> : null}
            {preview.error ? <Banner tone="danger" action={{ label: 'Retry', onSelect: () => setPreviewTry((n) => n + 1) }}>{preview.error}</Banner> : null}
            {preview.data && !catalog.isPending ? <ReportResult data={preview.data} catalog={datasourceCatalog} /> : null}
          </CardRow>
        ) : null}

        {error ? (
          <CardRow className="block">
            <Banner tone="danger">{error}</Banner>
          </CardRow>
        ) : null}

        {result ? (
          <CardFooter>
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
                <Button variant="link" loading={busy === 'undo'} onClick={() => void undo(result, previous)}>
                  Undo
                </Button>
              </Text>
            ) : null}
          </CardFooter>
        ) : (
          <CardFooter className="justify-end">
            {isUpdate ? (
              <Text variant="label" tone="ink-3" as="span" className="mr-auto">
                {`Updates “${title}”`}
              </Text>
            ) : null}
            {isCreate ? (
              // Off until the dashboards list is in: before that "no default" can't be told apart, and a second Home would be made.
              <Button variant="secondary" size="sm" loading={busy === 'home'} disabled={Boolean(busy) || previewBlocks || !dashboards.isSuccess} onClick={() => void save(true)}>
                Add to Home
              </Button>
            ) : null}
            {isCreate ? (
              <Button variant="primary" size="sm" loading={busy === 'save'} disabled={Boolean(busy) || previewBlocks} onClick={() => void save(false)}>
                Save as report
              </Button>
            ) : null}
            {isUpdate ? (
              <Button variant="primary" size="sm" loading={busy === 'update'} disabled={Boolean(busy) || previewBlocks} onClick={() => void update()}>
                Update report
              </Button>
            ) : null}
            {isDelete ? (
              <Button variant="danger" size="sm" disabled={Boolean(busy)} onClick={() => setConfirming(true)}>
                Delete report
              </Button>
            ) : null}
          </CardFooter>
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
          confirmLabel="Delete report"
          confirmLoading={busy === 'delete'}
          onConfirm={() => void remove()}
        />
      ) : null}
    </>
  );
}
