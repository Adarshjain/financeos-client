'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Layout } from 'react-grid-layout/legacy';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import {
  DASHBOARD_GRID_COLUMNS,
  HALF_WIDTH,
  newWidget,
  validateWidgets,
} from '@/lib/dashboards.helpers';
import type {
  CreateDashboardRequest,
  DashboardResponse,
  DashboardWidget,
  UpdateDashboardRequest,
  WidgetResponse,
} from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';
import type { ReportSummaryResponse } from '@/lib/reports.types';

// Serialize the editable parts of a dashboard so unsaved changes can be detected.
export function editSignature(
  name: string,
  description: string,
  widgets: WidgetResponse[]
): string {
  return JSON.stringify({
    name,
    description,
    widgets: widgets.map((w) => ({
      id: w.id,
      reportId: w.reportId,
      title: w.title ?? null,
      layout: w.layout,
    })),
  });
}

interface UseDashboardEditorProps {
  mode: 'create' | 'edit';
  dashboard?: DashboardResponse;
}

export function useDashboardEditor({
  mode,
  dashboard,
}: UseDashboardEditorProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState(dashboard?.name ?? '');
  const [description, setDescription] = useState(dashboard?.description ?? '');
  const [widgets, setWidgets] = useState<WidgetResponse[]>(
    dashboard?.widgets ?? []
  );
  const [isDefault, setIsDefault] = useState(dashboard?.isDefault ?? false);
  const [editing, setEditing] = useState(mode === 'create');
  const [baseline, setBaseline] = useState(() =>
    editSignature(
      dashboard?.name ?? '',
      dashboard?.description ?? '',
      dashboard?.widgets ?? []
    )
  );

  const createMutation = useMutation({
    mutationFn: (body: CreateDashboardRequest) =>
      api.POST('/api/v1/dashboards', { body }).then((r) => r.data!),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDashboardRequest }) =>
      api.PUT('/api/v1/dashboards/{id}', { params: { path: { id } }, body }).then((r) => r.data!),
  });
  const saving = createMutation.isPending || updateMutation.isPending;

  const isDirty = editSignature(name, description, widgets) !== baseline;

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
        return {
          ...w,
          layout: { x: item.x, y: item.y, w: item.w, h: item.h },
        };
      });
      return changed ? next : prev;
    });
  };

  const addWidget = (report: ReportSummaryResponse) => {
    const bottomY = widgets.reduce(
      (max, w) => Math.max(max, w.layout.y + w.layout.h),
      0
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
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, title } : w))
    );

  const toggleWidgetWidth = (id: string) =>
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const isFull = w.layout.w >= DASHBOARD_GRID_COLUMNS;
        return {
          ...w,
          layout: {
            ...w.layout,
            w: isFull ? HALF_WIDTH : DASHBOARD_GRID_COLUMNS,
            x: isFull ? w.layout.x : 0,
          },
        };
      })
    );

  const startEdit = () => {
    setBaseline(editSignature(name, description, widgets));
    setEditing(true);
  };

  const discardAndExit = () => {
    if (mode === 'create' || !editing) {
      router.push('/dashboards');
      return;
    }
    const n = dashboard?.name ?? '';
    const d = dashboard?.description ?? '';
    const ws = dashboard?.widgets ?? [];
    setName(n);
    setDescription(d);
    setWidgets(ws);
    setBaseline(editSignature(n, d, ws));
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
      title: w.title ?? '',
      layout: w.layout,
    }));
    const errors = validateWidgets(requestWidgets);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      isDefault,
      widgets: requestWidgets,
    };

    try {
      const data =
        mode === 'edit' && dashboard
          ? await updateMutation.mutateAsync({ id: dashboard.id, body })
          : await createMutation.mutateAsync(body);

      qc.invalidateQueries({ queryKey: keys.dashboards.all });
      toast.success(
        mode === 'edit' ? 'Dashboard saved' : 'Dashboard created'
      );
      if (mode === 'create') {
        router.push(`/dashboards/${data.id}`);
      } else {
        setWidgets(data.widgets);
        setName(data.name);
        setDescription(data.description ?? '');
        setIsDefault(data.isDefault);
        setBaseline(
          editSignature(
            data.name,
            data.description ?? '',
            data.widgets
          )
        );
        setEditing(false);
      }
    } catch (e) {
      toast.error(
        e instanceof ApiError
          ? e.response.message
          : mode === 'edit'
            ? 'Failed to update dashboard'
            : 'Failed to create dashboard'
      );
    }
  };

  return {
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
  };
}
