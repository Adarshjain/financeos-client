'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Layout } from 'react-grid-layout/legacy';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { toDashboardWidget, validateWidgets } from '@/lib/dashboards.helpers';
import type {
  BuiltinWidgetResponse,
  CreateDashboardRequest,
  DashboardResponse,
  UpdateDashboardRequest,
  WidgetParams,
  WidgetResponse,
} from '@/lib/dashboards.types';
import { useSaveWidgetParams } from '@/lib/query/hooks/useDashboards';
import { keys } from '@/lib/query/keys';
import type { ReportSummaryResponse } from '@/lib/reports.types';
import { toastError } from '@/lib/toastError';

import {
  applyLayout,
  builtinWidgetResponse,
  editSignature,
  reportWidgetResponse,
  toggleWidth,
} from './dashboardEditor.helpers';

export { editSignature } from './dashboardEditor.helpers';

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
  // The last saved version: Discard returns to it (not to the page's initial load).
  const [saved, setSaved] = useState<DashboardResponse | undefined>(dashboard);
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
  const paramsMutation = useSaveWidgetParams();
  const saving = createMutation.isPending || updateMutation.isPending;

  const isDirty = editSignature(name, description, widgets) !== baseline;

  const handleLayoutChange = (layout: Layout) =>
    setWidgets((prev) => applyLayout(prev, layout));

  const addWidget = (report: ReportSummaryResponse) =>
    setWidgets((prev) => [...prev, reportWidgetResponse(prev, report)]);

  // Built-ins can be added any number of times (e.g. one bills widget per card).
  const addBuiltin = (def: BuiltinWidgetResponse, params: WidgetParams) =>
    setWidgets((prev) => [...prev, builtinWidgetResponse(prev, def, params)]);

  const removeWidget = (id: string) =>
    setWidgets((prev) => prev.filter((w) => w.id !== id));

  const updateTitle = (id: string, title: string | null) =>
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, title } : w))
    );

  const toggleWidgetWidth = (id: string) =>
    setWidgets((prev) => toggleWidth(prev, id));

  /**
   * "Widget settings" (view mode): save one widget's new params straight away
   * — the dashboard as shown, with only that widget changed — and take the
   * saved dashboard as the new baseline. Rejects on failure (the dialog
   * reports it and stays open). Not offered while editing or creating.
   */
  const saveWidgetParams = async (widgetId: string, params: WidgetParams) => {
    if (!dashboard || mode !== 'edit') return;
    const data = await paramsMutation.mutateAsync({
      dashboard: { id: dashboard.id, name, description, isDefault, widgets },
      widgetId,
      params,
    });
    setSaved(data);
    setWidgets(data.widgets);
    setName(data.name);
    setDescription(data.description ?? '');
    setIsDefault(data.isDefault);
    setBaseline(editSignature(data.name, data.description ?? '', data.widgets));
  };

  const startEdit = () => {
    setBaseline(editSignature(name, description, widgets));
    setEditing(true);
  };

  const discardAndExit = () => {
    if (mode === 'create' || !editing) {
      router.push('/dashboards');
      return;
    }
    const n = saved?.name ?? '';
    const d = saved?.description ?? '';
    const ws = saved?.widgets ?? [];
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
    const errors = validateWidgets(
      widgets.map((w) => ({ ...toDashboardWidget(w), builtin: w.builtin ?? null })),
    );
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    const requestWidgets = widgets.map(toDashboardWidget);
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
        setSaved(data);
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
      toastError(e, mode === 'edit'
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
    addBuiltin,
    removeWidget,
    updateTitle,
    toggleWidgetWidth,
    saveWidgetParams,
    startEdit,
    discardAndExit,
    save,
  };
}
