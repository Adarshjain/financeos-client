'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button, ConfirmDialog, Icon, Menu, MenuItem, showToast, Text, TextField } from '@/components/ds';
import { NEW_REPORT_HREF, reportHref, REPORTS_HREF } from '@/features/reports/list/reportsList';
import { ShellPage } from '@/features/shell/ShellPage';
import { useLeaveGuard } from '@/features/shell/useLeaveGuard';
import type { ReportCatalog, ReportData, ReportResponse } from '@/lib/reports.types';

import { initialEditorState, makeEditorReducer, snapshot, workingCatalog } from './editorState';
import { FORMAT_NAMES } from './options';
import { ReportConfigCard } from './ReportConfigCard';
import { ReportPreviewCard } from './ReportPreviewCard';
import { buildCreateRequest, buildRunRequest, buildUpdateRequest, validationIssues } from './serialize';
import type { Issues } from './typeOptions';
import { useReportDynamicOptions } from './useReportDynamicOptions';
import { useReportEditorActions } from './useReportEditorActions';
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
  const actions = useReportEditorActions();

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

  const runPreview = () => {
    if (issues.length > 0) {
      setShowIssues(true);
      return;
    }
    preview.run();
  };

  /** Validates, shows what is missing at its field, and tells whether the draft can be written. */
  const ready = (): boolean => {
    setShowIssues(true);
    setNameTried(true);
    return state.name.trim() !== '' && issues.length === 0;
  };

  const save = () => {
    if (!ready()) return;
    if (edit) {
      actions.update.mutate(
        { id: state.reportId as string, body: buildUpdateRequest(state, catalog) },
        {
          onSuccess: () => {
            setBaseline(snapshot(state));
            setSavedName(state.name.trim());
            showToast('Report saved');
          },
        },
      );
      return;
    }
    createCopy('Report created');
  };

  const createCopy = (message: string) =>
    actions.create.mutate(buildCreateRequest(state, catalog), {
      onSuccess: (saved) => {
        setBaseline(snapshot(state));
        showToast(message);
        router.replace(reportHref(saved.id));
      },
    });

  const saveAsNew = () => {
    if (ready()) createCopy('Saved as a new report');
  };

  const title = edit ? savedName : 'New report';
  const missing = showIssues ? issues.map((i) => i.message) : [];

  return (
    <ShellPage
      crumb="Insights / Reports"
      title={title}
      backHref={REPORTS_HREF}
      addHref={NEW_REPORT_HREF}
      addLabel="New report"
    >
      <div className="flex flex-col gap-space-12 desk:gap-space-16">
        <div className="flex flex-col gap-space-12 desk:flex-row desk:items-start desk:justify-between">
          <div className="flex flex-col gap-space-4 desk:flex-1 desk:max-w-container-md">
            <TextField
              size="xl"
              aria-label="Report name"
              placeholder="Report name"
              value={state.name}
              error={nameTried && state.name.trim() === '' ? 'Give the report a name.' : undefined}
              onValueChange={(value) => dispatch({ type: 'SET_NAME', value })}
            />
            <div className="flex flex-wrap items-center gap-x-space-8">
              <Text variant="caption" tone="ink-3">
                {FORMAT_NAMES[state.type]} · {allDatasources.datasources.find((d) => d.name === state.datasource)?.label ?? state.datasource}
              </Text>
              {dirty ? (
                <Text variant="caption" tone="warning">
                  Unsaved changes
                </Text>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-space-8">
            <Button asChild variant="secondary" className="flex-1 desk:flex-none">
              <Link href={REPORTS_HREF}>Cancel</Link>
            </Button>
            <Button variant="primary" className="flex-1 desk:flex-none" loading={saving} onClick={save}>
              Save report
            </Button>
            {edit ? (
              <Menu
                align="end"
                trigger={
                  <Button variant="secondary" iconOnly aria-label="More actions">
                    <Icon name="more" size="sm" />
                  </Button>
                }
              >
                <MenuItem disabled={saving} onSelect={saveAsNew}>
                  Save as new
                </MenuItem>
                <MenuItem disabled={actions.duplicate.isPending} onSelect={() => actions.duplicate.mutate(state.reportId as string)}>
                  Duplicate
                </MenuItem>
                <MenuItem destructive onSelect={() => setDeleting(true)}>
                  Delete
                </MenuItem>
              </Menu>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 desk:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] items-start gap-space-12 desk:gap-space-16">
          <ReportConfigCard
            allDatasources={allDatasources}
            catalog={catalog}
            dynamicOptions={dynamicOptions}
            state={state}
            dispatch={dispatch}
            issues={showIssues ? firstPerKey(issues) : {}}
          />
          <ReportPreviewCard preview={preview} catalog={catalog} missing={missing} onPreview={runPreview} />
        </div>
      </div>

      {guard.pendingHref ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) guard.cancelLeave();
          }}
          tone="default"
          title="Leave without saving?"
          description="This report has changes that are not saved."
          impact={['Your changes to this report are lost.', 'The saved version stays as it is.']}
          confirmLabel="Leave without saving"
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
          title="Delete report"
          description={`Delete ${savedName}?`}
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
