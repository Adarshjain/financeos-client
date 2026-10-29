'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Banner, ConfirmDialog, showToast, Text } from '@/components/ds';
import { REPORTS_HREF } from '@/features/reports/list/reportsListModel';
import { subCrumb } from '@/features/shell/navigation';
import { afterNextRoute, hasInAppHistory } from '@/features/shell/navigationStore';
import { ShellPage } from '@/features/shell/ShellPage';
import { useLeaveGuard } from '@/features/shell/useLeaveGuard';
import type { ReportCatalog, ReportData, ReportResponse } from '@/lib/reports.types';

import type { BuilderAction } from './builderReducerModel';
import { EditorActions } from './EditorActions';
import { initialEditorState, makeEditorReducer, snapshot, workingCatalog } from './editorStateModel';
import { guardProblems } from './guardsModel';
import { ReportConfigCard } from './ReportConfigCard';
import { ReportPreviewCard } from './ReportPreviewCard';
import { buildCreateRequest, buildRunRequest, buildUpdateRequest, validationIssues } from './serializeModel';
import type { Issues } from './typeOptions';
import { useReportDynamicOptions } from './useReportDynamicOptions';
import { useReportEditorMutations } from './useReportEditorMutations';
import { useReportPreview } from './useReportPreview';

export interface ReportEditorProps {
  catalog: ReportCatalog;
  /** A saved report: the editor opens on it. Without it this is the New report page. */
  report?: ReportResponse;
  /** The saved report's result, run on the server, so the first render already shows it. */
  initialResult?: ReportData | null;
  /** `?template=` of the New report page. */
  templateId?: string | string[];
}

/** The first message of each kind, as the fields show them. */
function firstPerKey(issues: ReturnType<typeof validationIssues>): Issues {
  const map: Issues = {};
  for (const i of issues) map[i.key] ??= i.message;
  return map;
}

/**
 * The report editor (New report and a saved report's page: there is no separate report view). The draft is one
 * reducer; Preview runs it on demand; Save, Save as new, Duplicate and Delete write it. Unsaved work is flagged
 * and guarded: leaving by a link, Back, a reload or closing the tab asks first.
 */
export function ReportEditor({ catalog: allDatasources, report, initialResult, templateId }: ReportEditorProps) {
  const router = useRouter();
  const actions = useReportEditorMutations();

  const [initial] = React.useState(() => initialEditorState({ catalog: allDatasources, report, templateId }));
  const reducer = React.useMemo(() => makeEditorReducer(allDatasources), [allDatasources]);
  const [state, dispatch] = React.useReducer(reducer, initial);
  const [baseline, setBaseline] = React.useState(() => snapshot(initial));
  const [savedName, setSavedName] = React.useState(report?.name ?? '');
  const [showIssues, setShowIssues] = React.useState(false);
  const [nameTried, setNameTried] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const catalog = React.useMemo(() => workingCatalog(allDatasources, state.datasource), [allDatasources, state.datasource]);
  const dynamicOptions = useReportDynamicOptions(state.datasource, catalog, state.filters);

  const { request, signature } = React.useMemo(() => {
    const req = buildRunRequest(state, catalog);
    return { request: req, signature: JSON.stringify(req) };
  }, [state, catalog]);
  const issues = React.useMemo(() => validationIssues(state, catalog), [state, catalog]);
  // Combination problems the server would reject. A warning only: they never gate Preview.
  const problems = React.useMemo(() => guardProblems(state, catalog), [state, catalog]);
  // The definition the editor opened with, to tell a rename (allowed on a saved report) from a changed definition.
  const [openingDefinition] = React.useState(() =>
    JSON.stringify(buildUpdateRequest(initial, workingCatalog(allDatasources, initial.datasource)).definition),
  );

  const initialShown = React.useMemo(
    () =>
      initialResult
        ? (() => {
            const initialRequest = buildRunRequest(initial, workingCatalog(allDatasources, initial.datasource));
            return { data: initialResult, request: initialRequest, signature: JSON.stringify(initialRequest) };
          })()
        : null,
    // The server's first run belongs to the draft the editor opened on, whatever it becomes later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const preview = useReportPreview({ request, signature, valid: issues.length === 0, initial: initialShown });

  const dirty = snapshot(state) !== baseline;
  const guard = useLeaveGuard(dirty);
  const saving = actions.create.isPending || actions.update.isPending;
  const edit = state.mode === 'edit' && !!state.reportId;

  // A save takes the visitor back to where they came from (the list, a dashboard, the report's page). It waits for the
  // draft to be marked clean, so the unsaved-changes guard does not ask; the page it lands on is refreshed.
  const [leaving, setLeaving] = React.useState(false);
  React.useEffect(() => {
    if (!leaving || dirty) return;
    setLeaving(false);
    if (hasInAppHistory()) router.back();
    else router.push(REPORTS_HREF);
    // Once the page it opens has committed (history.back is async), so that page, not this one, is refetched
    // instead of coming from Next's router cache.
    afterNextRoute(() => router.refresh());
  }, [leaving, dirty, router]);

  // The draft as it is now, for a save that finishes later: leaving only when nothing was edited meanwhile.
  const latest = React.useRef(state);
  latest.current = state;
  const leaveIfUnchanged = (saved: string) => {
    if (snapshot(latest.current) === saved) setLeaving(true);
  };

  const runPreview = () => {
    if (issues.length > 0) {
      setShowIssues(true);
      return;
    }
    preview.run();
  };

  /**
   * Validates, shows what is missing at its field, and tells whether the draft can be written. A draft that breaks a
   * combination guard cannot be written as a new report, nor saved with a changed definition; a saved one renamed
   * only still can.
   */
  const ready = (createsReport: boolean): boolean => {
    setShowIssues(true);
    setNameTried(true);
    if (state.name.trim() === '' || issues.length > 0) return false;
    if (problems.length === 0) return true;
    const changed = JSON.stringify(buildUpdateRequest(state, catalog).definition) !== openingDefinition;
    return !createsReport && !changed;
  };

  const save = () => {
    if (!ready(!edit)) return;
    if (edit) {
      const saved = snapshot(state);
      actions.update.mutate(
        { id: state.reportId as string, body: buildUpdateRequest(state, catalog) },
        {
          onSuccess: () => {
            setBaseline(saved);
            setSavedName(state.name.trim());
            showToast('Report saved');
            leaveIfUnchanged(saved);
          },
        },
      );
      return;
    }
    createCopy('Report created');
  };

  const createCopy = (message: string) => {
    const saved = snapshot(state);
    actions.create.mutate(buildCreateRequest(state, catalog), {
      onSuccess: () => {
        setBaseline(saved);
        showToast(message);
        leaveIfUnchanged(saved);
      },
    });
  };

  const saveAsNew = () => {
    if (ready(true)) createCopy('New report saved');
  };

  /** Changing the report type starts the preview over: the old result belongs to the old type. */
  const dispatchDraft = (action: BuilderAction) => {
    dispatch(action);
    if (action.type === 'SET_TYPE') {
      preview.clear();
      setShowIssues(false);
    }
  };

  const title = edit ? savedName : 'Add report';
  const missing = showIssues ? issues.map((i) => i.message) : [];

  return (
    <ShellPage
      crumb={subCrumb('reports')}
      title={title}
      backHref={REPORTS_HREF}
    >
      <div className="flex flex-col pb-space-48">
        <div className="grid grid-cols-1 desk:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] items-start gap-x-space-24 gap-y-space-8 desk:gap-space-16">
          <div className="flex flex-col gap-space-8 desk:gap-space-16">
            {problems.length > 0 ? (
              <Banner tone="warning" title="These numbers don't add up">
                <div className="flex flex-col gap-space-4">
                  {problems.map((message) => (
                    <Text key={message} variant="body" as="p">
                      {message}
                    </Text>
                  ))}
                </div>
              </Banner>
            ) : null}
            <ReportConfigCard
              allDatasources={allDatasources}
              catalog={catalog}
              dynamicOptions={dynamicOptions}
              state={state}
              dispatch={dispatchDraft}
              issues={showIssues ? firstPerKey(issues) : {}}
              nameError={nameTried && state.name.trim() === '' ? 'Give the report a name.' : undefined}
            />
          </div>
          <ReportPreviewCard preview={preview} catalog={catalog} missing={missing} onPreview={runPreview} />
        </div>
      </div>

      <EditorActions
        dirty={dirty}
        edit={edit}
        saving={saving}
        duplicating={actions.duplicate.isPending}
        onCancel={() => guard.requestLeave(REPORTS_HREF)}
        onSave={save}
        onSaveAsNew={saveAsNew}
        onDuplicate={() => actions.duplicate.mutate(state.reportId as string)}
        onDelete={() => setDeleting(true)}
      />

      {guard.pendingHref ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) guard.cancelLeave();
          }}
          tone="default"
          title="Discard changes?"
          description="This report has changes that are not saved."
          impact={['Your changes to this report are lost.', 'The saved version stays as it is.']}
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={guard.confirmLeave}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !actions.remove.isPending) setDeleting(false);
          }}
          title="Delete report?"
          description={`${savedName} will be deleted. This can't be undone.`}
          impact={[
            'The report and its settings go.',
            'Dashboards that use it will show the report as unavailable.',
            'Your transactions and other data stay.',
          ]}
          confirmLabel="Delete report"
          confirmLoading={actions.remove.isPending}
          onConfirm={() =>
            actions.remove.mutate(state.reportId as string, {
              onSuccess: () => {
                setBaseline(snapshot(state));
                router.push(REPORTS_HREF);
                // Last, so the list it opens is not the cached one.
                router.refresh();
              },
            })
          }
        />
      ) : null}
    </ShellPage>
  );
}
