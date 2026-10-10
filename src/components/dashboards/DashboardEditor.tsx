'use client';

// Dashboard shell: renders the widget grid and toggles between VIEW (each widget
// runs its report and renders the data) and EDIT (drag/resize/add/remove +
// title overrides). Saving sends the FULL widget set via create/updateDashboard.

import { Card } from '@/components/ui/card';
import { isTextWidget } from '@/lib/dashboards.helpers';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { useReportsList } from '@/lib/query/hooks/useReports';

import { DashboardGrid } from './DashboardGrid';
import { DashboardTextWidget } from './DashboardTextWidget';
import { DashboardWidgetView } from './DashboardWidgetView';
import { DashboardEditorHeader } from './editor/DashboardEditorHeader';
import { useDashboardEditor } from './editor/useDashboardEditor';

interface DashboardEditorProps {
  mode: 'create' | 'edit';
  dashboard?: DashboardResponse;
}

export function DashboardEditor({
  mode,
  dashboard,
}: DashboardEditorProps) {
  const { data: reportsData } = useReportsList();

  const reports = reportsData ?? [];
  const {
    name,
    setName,
    description,
    widgets,
    editing,
    saving,
    isDirty,
    handleLayoutChange,
    addWidget,
    addBuiltin,
    addHeader,
    updateHeader,
    removeWidget,
    updateTitle,
    toggleWidgetWidth,
    saveWidgetParams,
    startEdit,
    discardAndExit,
    save,
  } = useDashboardEditor({
    mode,
    dashboard,
  });

  return (
    <div className="space-y-2 py-4 pb-20">
      <DashboardEditorHeader
        mode={mode}
        editing={editing}
        isDirty={isDirty}
        name={name}
        setName={setName}
        description={description}
        saving={saving}
        reports={reports}
        onDiscardAndExit={discardAndExit}
        onStartEdit={startEdit}
        onAddWidget={addWidget}
        onAddBuiltin={addBuiltin}
        onAddHeader={addHeader}
        onSave={save}
      />

      {widgets.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <p className="mb-2 text-slate-600 dark:text-slate-400">
              No widgets yet
            </p>
            <p className="text-sm text-slate-500">
              {editing
                ? 'Add a built-in or report widget, or a header, to get started.'
                : 'Click Edit to add widgets.'}
            </p>
          </div>
        </Card>
      ) : (
        <DashboardGrid
          widgets={widgets}
          editing={editing}
          onLayoutChange={handleLayoutChange}
          renderWidget={(w, fit) =>
            isTextWidget(w) ? (
              <DashboardTextWidget
                widget={w}
                editing={editing}
                onChange={(change) => updateHeader(w.id, change)}
                onRemove={() => removeWidget(w.id)}
              />
            ) : (
              <DashboardWidgetView
                widget={w}
                fit={fit}
                editing={editing}
                onTitleChange={(t) => updateTitle(w.id, t)}
                onRemove={() => removeWidget(w.id)}
                onToggleWidth={() => toggleWidgetWidth(w.id)}
                onParamsChange={
                  !editing && mode === 'edit' ? (params) => saveWidgetParams(w.id, params) : undefined
                }
              />
            )
          }
        />
      )}
    </div>
  );
}
