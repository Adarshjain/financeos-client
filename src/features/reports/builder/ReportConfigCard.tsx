'use client';

import React from 'react';

import { SegmentedControl } from '@/components/ds/SegmentedControl/SegmentedControl';
import { Select } from '@/components/ds/Select/Select';
import { TextArea } from '@/components/ds/TextArea/TextArea';
import { TextField } from '@/components/ds/TextField/TextField';
import type { DatasourceCatalog, ReportCatalog, ReportType } from '@/lib/reports.types';

import type { BuilderAction, BuilderState } from './builderReducerModel';
import type { DynamicOptions } from './catalog';
import { ConfigSection } from './ConfigSection';
import { workingCatalog } from './editorStateModel';
import { FilterChips } from './FilterChips';
import { datasourceGroups, FORMAT_OPTIONS } from './optionsModel';
import { ChartOptions, type Issues, KpiOptions, TableOptions } from './typeOptions';

export interface ReportConfigCardProps {
  allDatasources: ReportCatalog;
  catalog: DatasourceCatalog;
  dynamicOptions: DynamicOptions;
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
  issues: Issues;
  /** "Give the report a name." once a save was tried without one. */
  nameError?: string;
}

/** The left column of the editor: name, description and datasource, then a section each for the format, its options and the filters. */
export function ReportConfigCard({ allDatasources, catalog, dynamicOptions, state, dispatch, issues, nameError }: ReportConfigCardProps) {
  // Format and datasource are fixed once the report is saved.
  const fixed = state.mode === 'edit';
  const section = { catalog, state, dispatch, issues };
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <div className="flex flex-col gap-space-8 desk:gap-space-12">
        <TextField
          label="Report name"
          placeholder="Report name"
          value={state.name}
          error={nameError}
          onValueChange={(value) => dispatch({ type: 'SET_NAME', value })}
        />
        <TextArea
          label="Description"
          optional
          controlClassName="block"
          placeholder="What this report answers"
          value={state.description}
          onValueChange={(value) => dispatch({ type: 'SET_DESCRIPTION', value })}
        />
        <Select
          label="Datasource"
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

      <ConfigSection>
        <SegmentedControl
          fullWidth
          size="sm"
          aria-label="Report format"
          options={FORMAT_OPTIONS}
          value={state.type}
          disabled={fixed}
          onValueChange={(value: ReportType) => dispatch({ type: 'SET_TYPE', value })}
        />
      </ConfigSection>

      {state.type === 'KPI' ? <KpiOptions {...section} /> : null}
      {state.type === 'CHART' ? <ChartOptions {...section} /> : null}
      {state.type === 'TABLE' ? <TableOptions {...section} /> : null}

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
  );
}
