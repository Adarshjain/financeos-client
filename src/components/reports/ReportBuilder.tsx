'use client';

// The builder shell: a two-pane layout (configuration left, live preview right)
// driven by one reducer. Switching report type is non-destructive — shared bits
// (name, description, filters) and the other types' drafts are preserved.

import { ArrowLeft, Hash, LineChart, Loader2, Table2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useReducer, useState } from 'react';
import { toast } from 'sonner';

import { createReport, updateReport } from '@/actions/reports';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { DatasourceCatalog, ReportResponse, ReportType } from '@/lib/reports.types';

import { builderReducer, hydrateState, initialBuilderState } from './builderReducer';
import type { DynamicOptions } from './catalog';
import { ChartConfig } from './ChartConfig';
import { FilterEditor } from './FilterEditor';
import { KpiConfig } from './KpiConfig';
import { PreviewPane } from './PreviewPane';
import { buildCreateRequest, buildUpdateRequest, isMinimalValid } from './serialize';
import { TableConfig } from './TableConfig';
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
    mode === 'edit' && report
      ? hydrateState(report)
      : initialBuilderState('KPI', catalog),
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
    <div className="space-y-3 p-4 pb-20">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/reports')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl lg:text-2xl font-bold">{mode === 'create' ? 'Create' : 'Edit'} Report</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder="Report name"
          value={state.name}
          onChange={(e) =>
            dispatch({ type: 'SET_NAME', value: e.currentTarget.value })
          }
        />
        <Button variant="outline" onClick={() => router.push('/reports')}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {mode === 'edit' ? 'Save' : 'Create'}
        </Button>
      </div>
      <Textarea
        placeholder="Description"
        value={state.description}
        onChange={(e) =>
          dispatch({ type: 'SET_DESCRIPTION', value: e.currentTarget.value })
        }
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-1">
            <Tabs
              className="w-full"
              value={state.type}
              aria-disabled={mode === 'edit'}
              onValueChange={(v) =>
                dispatch({
                  type: 'SET_TYPE',
                  value: v as ReportType,
                })
              }
            >
              <TabsList className="w-full">
                <TabsTrigger disabled={mode === 'edit'} className="w-full gap-1" value="KPI">
                  <Hash className="h-3 w-3" />KPI
                </TabsTrigger>
                <TabsTrigger disabled={mode === 'edit'} className="w-full gap-1" value="CHART">
                  <LineChart className="h-3 w-3" />Chart
                </TabsTrigger>
                <TabsTrigger disabled={mode === 'edit'} className="w-full gap-1" value="TABLE">
                  <Table2 className="h-3 w-3" />Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
        </div>

        <Card className="self-start lg:sticky lg:top-6">
          <CardContent className="p-4">
            <PreviewPane state={state} catalog={catalog} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
