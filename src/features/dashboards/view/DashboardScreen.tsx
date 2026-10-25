'use client';

// A dashboard's page, for viewing, editing and creating (one page: edit is not a dialog).
//   View   the name as the title, "N widgets", Set as default and Edit, then the widgets as they read.
//   Edit   the name (required) and description, Add header, the widgets arranged by drag and resize, and the bottom
//          bar: Discard and Save. The top bar's + adds a widget. Leaving with unsaved changes asks first.
//   Create the same editor on an empty draft, with Cancel and Create.
// `?edit=1` opens straight into editing (the list's Edit link). The draft is one reducer; Save writes it with the
// widgets re-flowed into the server's 100-column layout.

import { useRouter } from 'next/navigation';
import React from 'react';

import { Button, ConfirmDialog, EmptyState, showToast, Text, TextField } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';
import { useLeaveGuard } from '@/features/shell/useLeaveGuard';
import { isTextWidget } from '@/lib/dashboards.helpers';
import type { BuiltinWidgetResponse, DashboardResponse } from '@/lib/dashboards.types';
import { useBuiltins } from '@/lib/query/hooks/useBuiltins';
import { useReportsList } from '@/lib/query/hooks/useReports';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { SAVE_FAILED, useSaveDashboard, useSaveWidgetSettings, useToggleDefault } from '../data/useDashboardActions';
import { textWidgetResponse } from '../editor/dashboardEditor.helpers';
import { editorReducer, editorSignature, initialEditorState, saveBody, widgetIssues } from '../editor/editorState';
import { widgetBuiltinKey } from '../frame/widgetFrame.model';
import { WidgetSettingsDialog } from '../frame/WidgetSettingsDialog';
import { WidgetPicker } from '../picker/WidgetPicker';
import { dashboardHref,DASHBOARDS_CRUMB, DASHBOARDS_HREF } from '../routes';
import { DashboardEditActions } from './DashboardEditActions';
import { DashboardEditGrid } from './DashboardEditGrid';
import { DashboardWidgets } from './DashboardWidgets';

const NO_BUILTINS: readonly BuiltinWidgetResponse[] = [];
const NO_REPORTS: readonly ReportSummaryResponse[] = [];
const NO_ISSUES: ReadonlyMap<string, string> = new Map();

export const NAME_REQUIRED = 'Name the dashboard.';

export interface DashboardScreenProps {
  /** The saved dashboard; without it this is the New dashboard page. */
  dashboard?: DashboardResponse;
  /** Open already editing (`?edit=1`, read on the server). */
  startEditing?: boolean;
}

export function DashboardScreen({ dashboard, startEditing = false }: DashboardScreenProps) {
  const creating = dashboard === undefined;
  const router = useRouter();
  const [saved, setSaved] = React.useState(dashboard);
  const [editing, setEditing] = React.useState(creating || startEditing);
  const [initial] = React.useState(() => initialEditorState(dashboard));
  const [state, dispatch] = React.useReducer(editorReducer, initial);
  const [baseline, setBaseline] = React.useState(() => editorSignature(initial));
  const [tried, setTried] = React.useState(false);
  const [focusTick, setFocusTick] = React.useState(0);
  const [picking, setPicking] = React.useState(false);
  const [settingsFor, setSettingsFor] = React.useState<string | null>(null);
  const [discarding, setDiscarding] = React.useState(false);
  const body = React.useRef<HTMLDivElement>(null);

  const catalog = useBuiltins().data ?? NO_BUILTINS;
  const reports = useReportsList().data ?? NO_REPORTS;
  const saveMutation = useSaveDashboard();
  const saveSettings = useSaveWidgetSettings(saved, setSaved);
  const toggleDefault = useToggleDefault(setSaved);

  const dirty = editorSignature(state) !== baseline;
  const guard = useLeaveGuard(editing && dirty);

  // The list's Edit link opens editing with ?edit=1: take the flag off the address so a reload after saving shows the dashboard.
  React.useEffect(() => {
    if (!startEditing) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('edit')) return;
    url.searchParams.delete('edit');
    window.history.replaceState(null, '', url);
  }, [startEditing]);

  // After a failed Save: the first thing marked in red takes focus.
  React.useEffect(() => {
    if (focusTick === 0) return;
    body.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-dashboard-problem]')?.focus();
  }, [focusTick]);

  const resetDraft = (from: DashboardResponse | undefined) => {
    const next = initialEditorState(from);
    dispatch({ type: 'RESET', state: next });
    setBaseline(editorSignature(next));
    setTried(false);
  };
  const startEdit = () => {
    resetDraft(saved);
    setEditing(true);
  };
  const exitEditing = () => {
    resetDraft(saved);
    setEditing(false);
  };

  const issues = tried ? widgetIssues(state.widgets, catalog) : NO_ISSUES;
  const nameError = tried && state.name.trim() === '' ? NAME_REQUIRED : undefined;

  const save = () => {
    const problems = state.name.trim() === '' || widgetIssues(state.widgets, catalog).size > 0;
    setTried(true);
    if (problems) {
      showToast(SAVE_FAILED, { tone: 'danger' });
      setFocusTick((t) => t + 1);
      return;
    }
    saveMutation.mutate(
      { id: saved?.id, body: saveBody(state, saved?.isDefault ?? false) },
      {
        onSuccess: (data) => {
          if (creating) {
            // What was typed is now saved: nothing is left to guard when the page moves on.
            setBaseline(editorSignature(state));
            router.replace(dashboardHref(data.id));
            return;
          }
          setSaved(data);
          resetDraft(data);
          setEditing(false);
        },
      },
    );
  };

  const discard = () => {
    if (creating) guard.requestLeave(DASHBOARDS_HREF);
    else if (dirty) setDiscarding(true);
    else exitEditing();
  };

  const addHeader = () => {
    // The new header's title field takes focus when it appears.
    dispatch({ type: 'ADD_HEADER', header: textWidgetResponse() });
  };

  const settingsWidget = settingsFor ? state.widgets.find((w) => w.id === settingsFor) : undefined;
  const settingsDef = settingsWidget ? catalog.find((d) => d.key === widgetBuiltinKey(settingsWidget)) : undefined;

  const shownName = saved?.name ?? 'New dashboard';
  const count = (saved?.widgets ?? []).filter((w) => !isTextWidget(w)).length;

  return (
    <ShellPage crumb={DASHBOARDS_CRUMB} title={shownName} backHref={DASHBOARDS_HREF} onAdd={editing ? () => setPicking(true) : undefined}>
      {editing ? (
        <div ref={body} className="flex flex-col gap-space-16 pb-space-48">
          <div className="flex flex-col gap-space-8 desk:max-w-container-md">
            <div className="flex items-start gap-space-12">
              <TextField
                className="flex-1"
                label="Dashboard name"
                placeholder="e.g. Cards and loans"
                value={state.name}
                error={nameError}
                onValueChange={(name) => dispatch({ type: 'SET_NAME', name })}
              />
              <Button variant="secondary" size="sm" className="mt-space-24" onClick={addHeader}>
                Add header
              </Button>
            </div>
            <TextField
              label="Description"
              optional
              value={state.description}
              onValueChange={(description) => dispatch({ type: 'SET_DESCRIPTION', description })}
            />
          </div>
          {state.widgets.length === 0 ? (
            <EmptyState
              title={creating ? 'Nothing on this dashboard yet' : 'This dashboard has no widgets yet'}
              description="Add a widget to start. You can rearrange and resize after."
              action={{ label: 'Add widget', onSelect: () => setPicking(true) }}
              secondaryAction={{ label: 'Add header', onSelect: addHeader }}
            />
          ) : (
            <>
              <Text variant="caption" tone="ink-3" as="p">
                Drag by the grip · resize from the corner
              </Text>
              <DashboardEditGrid
                widgets={state.widgets}
                catalog={catalog}
                issues={issues}
                onLayoutChange={(layout) => dispatch({ type: 'LAYOUT', layout })}
                onRemove={(id) => dispatch({ type: 'REMOVE', id })}
                onOpenSettings={setSettingsFor}
                onUpdateHeader={(id, change) => dispatch({ type: 'UPDATE_HEADER', id, change })}
                footer={
                  <div className="flex justify-center py-space-12">
                    <Text variant="label" as="span">
                      <Button variant="link" onClick={() => setPicking(true)}>
                        Add a widget
                      </Button>
                    </Text>
                  </div>
                }
              />
            </>
          )}
        </div>
      ) : saved ? (
        <div className="flex flex-col gap-space-16">
          <div className="flex flex-wrap items-center justify-between gap-space-12">
            <div className="flex flex-col gap-space-2">
              {saved.description ? (
                <Text variant="body" tone="ink-3" as="p">
                  {saved.description}
                </Text>
              ) : null}
              <Text variant="caption" tone="ink-3" as="p">
                {`${count} ${count === 1 ? 'widget' : 'widgets'}`}
              </Text>
            </div>
            <div className="flex items-center gap-space-8">
              <Button
                variant="secondary"
                loading={toggleDefault.isPending}
                onClick={() => toggleDefault.mutate({ id: saved.id, makeDefault: !saved.isDefault, updatedAt: saved.updatedAt })}
              >
                {saved.isDefault ? 'Clear default' : 'Set as default'}
              </Button>
              <Button variant="primary" onClick={startEdit}>
                Edit
              </Button>
            </div>
          </div>
          {saved.widgets.length === 0 ? (
            <EmptyState
              title="This dashboard has no widgets yet"
              description="Use Add widget to put built-ins or your saved reports here."
              action={{
                label: 'Add widget',
                onSelect: () => {
                  startEdit();
                  setPicking(true);
                },
              }}
            />
          ) : (
            <DashboardWidgets widgets={saved.widgets} catalog={catalog} dashboardName={saved.name} onSaveSettings={saveSettings} />
          )}
        </div>
      ) : null}

      {editing ? (
        <DashboardEditActions creating={creating} dirty={dirty} saving={saveMutation.isPending} onDiscard={discard} onSave={save} />
      ) : null}

      {picking ? (
        <WidgetPicker
          reports={reports}
          onAddBuiltin={(def, params, title) => dispatch({ type: 'ADD_BUILTIN', def, params, title })}
          onAddReport={(report, title) => dispatch({ type: 'ADD_REPORT', report, title })}
          onClose={() => setPicking(false)}
        />
      ) : null}

      {settingsWidget ? (
        <WidgetSettingsDialog
          widget={settingsWidget}
          def={settingsDef}
          dashboardName={state.name.trim() || undefined}
          onSave={(change) => dispatch({ type: 'SETTINGS', id: settingsWidget.id, ...change })}
          onClose={() => setSettingsFor(null)}
        />
      ) : null}

      {discarding || guard.pendingHref ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (open) return;
            setDiscarding(false);
            guard.cancelLeave();
          }}
          title="Discard changes?"
          description={`Your edits to ${shownName} will be lost.`}
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={() => {
            if (guard.pendingHref) guard.confirmLeave();
            else {
              setDiscarding(false);
              exitEditing();
            }
          }}
        />
      ) : null}
    </ShellPage>
  );
}
