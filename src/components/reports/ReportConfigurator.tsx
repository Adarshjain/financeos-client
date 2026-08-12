'use client';

import { Hash, LineChart, Table2 } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DatasourceCatalog, ReportType } from '@/lib/reports.types';

import type { BuilderAction, BuilderState } from './builderReducer';
import type { DynamicOptions } from './catalog';
import { ChartConfig } from './ChartConfig';
import { FilterEditor } from './FilterEditor';
import { KpiConfig } from './KpiConfig';
import { TableConfig } from './TableConfig';

export interface ReportConfiguratorProps {
  catalog: DatasourceCatalog;
  dynamicOptions: DynamicOptions;
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
}

export function ReportConfigurator({
  catalog,
  dynamicOptions,
  state,
  dispatch,
}: ReportConfiguratorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Report Format
        </label>
        <Tabs
          value={state.type}
          onValueChange={(val) =>
            dispatch({ type: 'SET_TYPE', value: val as ReportType })
          }
        >

          <TabsList className="grid grid-cols-3 h-8 text-xs">
            <TabsTrigger value="KPI" className="flex items-center gap-1 text-xs px-2.5">
              <Hash className="h-3 w-3" />
              KPI
            </TabsTrigger>
            <TabsTrigger value="CHART" className="flex items-center gap-1 text-xs px-2.5">
              <LineChart className="h-3 w-3" />
              Chart
            </TabsTrigger>
            <TabsTrigger value="TABLE" className="flex items-center gap-1 text-xs px-2.5">
              <Table2 className="h-3 w-3" />
              Table
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
  );
}
