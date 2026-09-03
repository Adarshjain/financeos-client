'use client';

// The builder shell: a two-pane layout (configuration left, live preview right)
// driven by one reducer. Switching report type is non-destructive — shared bits
// (name, description, filters) and the other types' drafts are preserved.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useReducer } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type {
  CreateReportRequest,
  DatasourceCatalog,
  ReportCatalog,
  ReportResponse,
  UpdateReportRequest,
} from '@/lib/reports.types';

import { builderReducer, hydrateState, initialBuilderState } from './builderReducer';
import type { DynamicOptions } from './catalog';
import { PreviewPane } from './PreviewPane';
import { ReportConfigurator } from './ReportConfigurator';
import { buildCreateRequest, buildUpdateRequest, isMinimalValid } from './serialize';

interface ReportBuilderProps {
  mode: 'create' | 'edit';
  catalog: ReportCatalog;
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
  const qc = useQueryClient();

  const getWorkingCatalog = (dsName: string): DatasourceCatalog => {
    const dsDef = catalog.datasources.find((d) => d.name === dsName) ?? catalog.datasources[0];
    return {
      fields: dsDef ? dsDef.fields : [],
      operators: catalog.operators,
    };
  };

  const [state, dispatch] = useReducer(builderReducer, undefined, () => {
    if (mode === 'edit' && report) {
      return hydrateState(report);
    }
    const initialDs = catalog.datasources[0]?.name ?? 'transactions';
    return initialBuilderState('KPI', getWorkingCatalog(initialDs), initialDs);
  });

  const activeCatalog = getWorkingCatalog(state.datasource);

  const createMutation = useMutation({
    mutationFn: (body: CreateReportRequest) =>
      api
        .POST('/api/v1/reports', {
          body: { ...body, description: body.description ?? undefined, definition: { ...body.definition } },
        })
        .then((r) => r.data!),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateReportRequest }) =>
      api
        .PUT('/api/v1/reports/{id}', {
          params: { path: { id } },
          body: { ...body, description: body.description ?? undefined, definition: { ...body.definition } },
        })
        .then((r) => r.data!),
  });
  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSave = async () => {
    if (!state.name.trim()) {
      toast.error('Give the report a name.');
      return;
    }
    if (!isMinimalValid(state, activeCatalog)) {
      toast.error('Finish configuring the report before saving.');
      return;
    }
    try {
      mode === 'edit' && state.reportId
        ? await updateMutation.mutateAsync({ id: state.reportId, body: buildUpdateRequest(state, activeCatalog) })
        : await createMutation.mutateAsync(buildCreateRequest(state, activeCatalog));
      qc.invalidateQueries({ queryKey: keys.reports.all });
      toast.success(mode === 'edit' ? 'Report updated' : 'Report created');
      router.push('/reports');
    } catch (e) {
      toast.error(
        e instanceof ApiError
          ? e.response.message
          : mode === 'edit'
            ? 'Failed to update report'
            : 'Failed to create report',
      );
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
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {mode === 'edit' ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>

      <Textarea
        placeholder="Description"
        value={state.description}
        onChange={(e) =>
          dispatch({ type: 'SET_DESCRIPTION', value: e.currentTarget.value })
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-3">
          <Select
            value={state.datasource}
            disabled={mode === 'edit'}
            onValueChange={(dsName) => {
              dispatch({
                type: 'SET_DATASOURCE',
                value: dsName,
                catalog: getWorkingCatalog(dsName),
              });
            }}
          >
            <SelectTrigger className="w-full h-9 text-xs font-semibold">
              <SelectValue placeholder="Select datasource" />
            </SelectTrigger>
            <SelectContent>
              {catalog.datasources.map((ds) => (
                <SelectItem key={ds.name} value={ds.name} className="text-xs">
                  {ds.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ReportConfigurator
            catalog={activeCatalog}
            dynamicOptions={dynamicOptions}
            state={state}
            dispatch={dispatch}
          />
        </div>

        <Card className="self-start lg:sticky lg:top-6">
          <CardContent className="p-4">
            <PreviewPane
              state={state}
              catalog={activeCatalog}
              autoRunOnMount={mode === 'edit'}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
