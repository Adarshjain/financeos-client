'use client';

// The builder shell: a two-pane layout (configuration left, live preview right)
// driven by one reducer. Switching report type is non-destructive — shared bits
// (name, filters, includeExcluded) and the other types' drafts are preserved.

import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useReducer, useState } from 'react';
import { toast } from 'sonner';

import { createReport, updateReport } from '@/actions/reports';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import type {
  DatasourceCatalog,
  ReportResponse,
  ReportType,
} from '@/lib/reports.types';

import {
  builderReducer,
  hydrateState,
  initialBuilderState,
} from './builderReducer';
import type { DynamicOptions } from './catalog';
import { ChartConfig } from './ChartConfig';
import { FilterEditor } from './FilterEditor';
import { KpiConfig } from './KpiConfig';
import { REPORT_TYPE_LABELS } from './labels';
import { PreviewPane } from './PreviewPane';
import {
  buildCreateRequest,
  buildUpdateRequest,
  isMinimalValid,
} from './serialize';
import { TableConfig } from './TableConfig';

const TYPE_OPTIONS = (Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map(
  (t) => ({ value: t, label: REPORT_TYPE_LABELS[t] }),
);

interface ReportBuilderProps {
  mode: 'create' | 'edit';
  catalog: DatasourceCatalog;
  dynamicOptions: DynamicOptions;
  report?: ReportResponse;
}

export function ReportBuilder({
  mode,
  catalog,
  dynamicOptions,
  report,
}: ReportBuilderProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(builderReducer, undefined, () =>
    mode === 'edit' && report ? hydrateState(report) : initialBuilderState(),
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!state.name.trim()) {
      toast.error('Give the report a name.');
      return;
    }
    if (!isMinimalValid(state, catalog)) {
      toast.error('Finish configuring the report before saving.');
      return;
    }
    setSaving(true);
    const res =
      mode === 'edit' && state.reportId
        ? await updateReport(state.reportId, buildUpdateRequest(state, catalog))
        : await createReport(buildCreateRequest(state, catalog));
    setSaving(false);
    if (res.success) {
      toast.success(mode === 'edit' ? 'Report updated' : 'Report created');
      router.push('/reports');
    } else {
      toast.error(res.error.message);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/reports')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          className="max-w-xs"
          placeholder="Report name"
          value={state.name}
          onChange={(e) =>
            dispatch({ type: 'SET_NAME', value: e.currentTarget.value })
          }
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/reports')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {mode === 'edit' ? 'Save changes' : 'Create report'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div>
              <Label>Report type</Label>
              <NativeSelect
                options={TYPE_OPTIONS}
                value={state.type}
                disabled={mode === 'edit'}
                className={
                  mode === 'edit' ? 'pointer-events-none opacity-40' : undefined
                }
                onChange={(e) =>
                  dispatch({
                    type: 'SET_TYPE',
                    value: e.currentTarget.value as ReportType,
                  })
                }
              />
            </div>

            {state.type === 'KPI' && (
              <KpiConfig
                catalog={catalog}
                value={state.kpi}
                onChange={(v) => dispatch({ type: 'KPI_SET', value: v })}
              />
            )}
            {state.type === 'CHART' && (
              <ChartConfig
                catalog={catalog}
                value={state.chart}
                onChange={(v) => dispatch({ type: 'CHART_SET', value: v })}
              />
            )}
            {state.type === 'TABLE' && (
              <TableConfig
                catalog={catalog}
                value={state.table}
                onChange={(v) => dispatch({ type: 'TABLE_SET', value: v })}
                onChangeRaw={(v) => dispatch({ type: 'TABLE_SET_RAW', value: v })}
                onChangeAgg={(v) => dispatch({ type: 'TABLE_SET_AGG', value: v })}
              />
            )}

            <label className="flex cursor-pointer items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Checkbox
                checked={state.includeExcluded}
                onCheckedChange={(c) =>
                  dispatch({ type: 'SET_INCLUDE_EXCLUDED', value: c === true })
                }
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Include transactions excluded from reports
              </span>
            </label>

            <FilterEditor
              catalog={catalog}
              dynamicOptions={dynamicOptions}
              filters={state.filters}
              onAdd={(c) => dispatch({ type: 'ADD_FILTER', value: c })}
              onUpdate={(i, c) =>
                dispatch({ type: 'UPDATE_FILTER', index: i, value: c })
              }
              onRemove={(i) => dispatch({ type: 'REMOVE_FILTER', index: i })}
            />
          </CardContent>
        </Card>

        <Card className="self-start lg:sticky lg:top-6">
          <CardContent className="p-4">
            <PreviewPane state={state} catalog={catalog} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
