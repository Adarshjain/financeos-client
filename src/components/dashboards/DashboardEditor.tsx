'use client';

// Dashboard shell: renders the widget grid and toggles between VIEW (each widget
// runs its report and renders the data) and EDIT (drag/resize/add/remove +
// title overrides). Saving sends the FULL widget set via create/updateDashboard.

import { ArrowLeft, Loader2, Pencil, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Layout } from 'react-grid-layout/legacy';
import { toast } from 'sonner';

import { createDashboard, updateDashboard } from '@/actions/dashboards';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { newWidget, validateWidgets } from '@/lib/dashboards.helpers';
import type {
  DashboardResponse,
  DashboardWidget,
  WidgetResponse,
} from '@/lib/dashboards.types';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { AddWidgetDialog } from './AddWidgetDialog';
import { DashboardGrid } from './DashboardGrid';
import { DashboardWidgetView } from './DashboardWidgetView';
import { WidgetEditCard } from './WidgetEditCard';

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
  const router = useRouter();
  const [name, setName] = useState(dashboard?.name ?? '');
  const [description, setDescription] = useState(dashboard?.description ?? '');
  const [widgets, setWidgets] = useState<WidgetResponse[]>(
    dashboard?.widgets ?? [],
  );
  const [editing, setEditing] = useState(mode === 'create');
  const [saving, setSaving] = useState(false);

  const handleLayoutChange = (layout: Layout) => {
    setWidgets((prev) => {
      let changed = false;
      const next = prev.map((w) => {
        const item = layout.find((l) => l.i === w.id);
        if (!item) return w;
        if (
          item.x === w.layout.x &&
          item.y === w.layout.y &&
          item.w === w.layout.w &&
          item.h === w.layout.h
        ) {
          return w;
        }
        changed = true;
        return { ...w, layout: { x: item.x, y: item.y, w: item.w, h: item.h } };
      });
      return changed ? next : prev;
    });
  };

  const addWidget = (report: ReportSummaryResponse) => {
    const bottomY = widgets.reduce(
      (max, w) => Math.max(max, w.layout.y + w.layout.h),
      0,
    );
    const widget = newWidget(report.id, { y: bottomY });
    setWidgets((prev) => [
      ...prev,
      {
        id: widget.id,
        reportId: widget.reportId,
        title: widget.title ?? null,
        layout: widget.layout,
        report: { name: report.name, type: report.type, available: true },
      },
    ]);
  };

  const removeWidget = (id: string) =>
    setWidgets((prev) => prev.filter((w) => w.id !== id));

  const updateTitle = (id: string, title: string | null) =>
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, title } : w)));

  const cancel = () => {
    if (mode === 'create') {
      router.push('/dashboards');
      return;
    }
    setName(dashboard?.name ?? '');
    setDescription(dashboard?.description ?? '');
    setWidgets(dashboard?.widgets ?? []);
    setEditing(false);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error('Name the dashboard.');
      return;
    }
    const requestWidgets: DashboardWidget[] = widgets.map((w) => ({
      id: w.id,
      reportId: w.reportId,
      title: w.title,
      layout: w.layout,
    }));
    const errors = validateWidgets(requestWidgets);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      widgets: requestWidgets,
    };

    setSaving(true);
    const res =
      mode === 'edit' && dashboard
        ? await updateDashboard(dashboard.id, body)
        : await createDashboard(body);
    setSaving(false);

    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(mode === 'edit' ? 'Dashboard saved' : 'Dashboard created');
    if (mode === 'create') {
      router.push(`/dashboards/${res.data.id}`);
    } else {
      setWidgets(res.data.widgets);
      setName(res.data.name);
      setDescription(res.data.description ?? '');
      setEditing(false);
      router.refresh();
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboards')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {editing ? (
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              className="max-w-xs"
              placeholder="Dashboard name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <Input
              className="max-w-sm"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
          </div>
        ) : (
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {name}
            </h1>
            {description && (
              <p className="text-sm text-slate-500">{description}</p>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {editing ? (
            <>
              <AddWidgetDialog reports={reports} onAdd={addWidget} />
              <Button variant="outline" onClick={cancel}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {mode === 'edit' ? 'Save changes' : 'Create dashboard'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

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
          renderWidget={(w) =>
            editing ? (
              <WidgetEditCard
                widget={w}
                onTitleChange={(t) => updateTitle(w.id, t)}
                onRemove={() => removeWidget(w.id)}
              />
            ) : (
              <DashboardWidgetView widget={w} />
            )
          }
        />
      )}
    </div>
  );
}
