'use client';

// Dashboard shell: renders the widget grid and toggles between VIEW (each widget
// runs its report and renders the data) and EDIT (drag/resize/add/remove +
// title overrides). Saving sends the FULL widget set via create/updateDashboard.

import { Card } from '@/components/ui/card';
import type { DashboardResponse } from '@/lib/dashboards.types';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { DashboardGrid } from './DashboardGrid';
import { DashboardWidgetView } from './DashboardWidgetView';
import { DashboardEditorHeader } from './editor/DashboardEditorHeader';
import { useDashboardEditor } from './editor/useDashboardEditor';

interface DashboardEditorProps {
  mode: 'create' | 'edit';
  reports: ReportSummaryResponse[];
  dashboard?: DashboardResponse;
}

export function DashboardEditor({
  mode,
  reports,
  dashboard,
}: DashboardEditorProps) {
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
    removeWidget,
    updateTitle,
    toggleWidgetWidth,
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
                ? 'Add a report widget to get started.'
                : 'Click Edit to add report widgets.'}
            </p>
          </div>
        </Card>
      ) : (
        <DashboardGrid
          widgets={widgets}
          editing={editing}
          onLayoutChange={handleLayoutChange}
          renderWidget={(w) => (
            <DashboardWidgetView
              widget={w}
              editing={editing}
              onTitleChange={(t) => updateTitle(w.id, t)}
              onRemove={() => removeWidget(w.id)}
              onToggleWidth={() => toggleWidgetWidth(w.id)}
            />
          )}
        />
      )}
    </div>
  );
}
