'use client';

import React from 'react';

import { Card, SegmentedControl, Select, Text, TextArea } from '@/components/ds';
import type { DatasourceCatalog, ReportCatalog, ReportType } from '@/lib/reports.types';

import type { BuilderAction, BuilderState } from './builderReducer';
import type { DynamicOptions } from './catalog';
import { workingCatalog } from './editorState';
import { FilterChips } from './FilterChips';
import { datasourceGroups, FORMAT_HINTS, FORMAT_OPTIONS } from './options';
import { ChartOptions, type Issues, KpiOptions, TableOptions } from './typeOptions';

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="overline" tone="ink-3" as="p">
      {children}
    </Text>
  );
}

export interface ReportConfigCardProps {
  allDatasources: ReportCatalog;
  catalog: DatasourceCatalog;
  dynamicOptions: DynamicOptions;
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
  issues: Issues;
}

/** The left card of the editor: description, format, datasource, the format's own options, then the filters. */
export function ReportConfigCard({ allDatasources, catalog, dynamicOptions, state, dispatch, issues }: ReportConfigCardProps) {
  // Format and datasource are fixed once the report is saved.
  const fixed = state.mode === 'edit';
  const section = { catalog, state, dispatch, issues };
  return (
    <Card>
      <div className="flex flex-col gap-space-16 p-space-16">
        <TextArea
          label="Description"
          optional
          minRows={2}
          placeholder="What this report answers"
          value={state.description}
          onValueChange={(value) => dispatch({ type: 'SET_DESCRIPTION', value })}
        />

        <div className="flex flex-col gap-space-8">
          <Overline>Format</Overline>
          <SegmentedControl
            fullWidth
            aria-label="Report format"
            options={FORMAT_OPTIONS}
            value={state.type}
            disabled={fixed}
            onValueChange={(value: ReportType) => dispatch({ type: 'SET_TYPE', value })}
          />
          <Text variant="caption" tone="ink-3" as="p">
            {FORMAT_HINTS[state.type]}
          </Text>
        </div>

        <div className="flex flex-col gap-space-8">
          <Overline>Datasource</Overline>
          <Select
            aria-label="Datasource"
            searchable
            groups={datasourceGroups(allDatasources.datasources)}
            value={state.datasource}
            disabled={fixed}
            onValueChange={(name) => {
              const value = Array.isArray(name) ? name[0] : name;
              if (value) dispatch({ type: 'SET_DATASOURCE', value, catalog: workingCatalog(allDatasources, value) });
            }}
          />
        </div>

        {state.type === 'KPI' ? <KpiOptions {...section} /> : null}
        {state.type === 'CHART' ? <ChartOptions {...section} /> : null}
        {state.type === 'TABLE' ? <TableOptions {...section} /> : null}

        <div className="flex flex-col gap-space-8">
          <Overline>Filters</Overline>
          <FilterChips
            catalog={catalog}
            dynamicOptions={dynamicOptions}
            filters={state.filters}
            error={issues.filters}
            onAdd={(value) => dispatch({ type: 'ADD_FILTER', value })}
            onUpdate={(index, value) => dispatch({ type: 'UPDATE_FILTER', index, value })}
            onRemove={(index) => dispatch({ type: 'REMOVE_FILTER', index })}
          />
        </div>
      </div>
    </Card>
  );
}
