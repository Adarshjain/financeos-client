'use client';

import { Plus, Trash } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Aggregation, DatasourceCatalog } from '@/lib/reports.types';

import type {
  AggTableDraft,
  DimensionDraft,
  MeasureDraft,
} from '../builderReducer';
import { newDraftId } from '../builderReducer';
import { fieldByName } from '../catalog';
import { AGGREGATION_LABELS } from '../labels';
import { MeasureRefEditor } from '../MeasureRefEditor';
import { aggregatedColumnKey } from '../serialize';
import type { SortKey } from '../SortBuilder';
import { SortBuilder } from '../SortBuilder';
import { DimensionList } from './DimensionList';

export const fieldNames = (drafts: DimensionDraft[]): string[] =>
  drafts.filter((d) => d.field).map((d) => d.field as string);

interface AggTableConfigProps {
  catalog: DatasourceCatalog;
  agg: AggTableDraft;
  onChangeAgg: (value: Partial<AggTableDraft>) => void;
}

export function AggTableConfig({
  catalog,
  agg,
  onChangeAgg,
}: AggTableConfigProps) {
  const labelFor = (name: string | undefined) =>
    fieldByName(catalog, name)?.label ?? name ?? '';

  const aggSortKeys = (
    rows: DimensionDraft[],
    columns: DimensionDraft[],
    measures: MeasureDraft[]
  ): SortKey[] => {
    const keys: SortKey[] = [];
    rows
      .filter((g) => g.field)
      .forEach((g) =>
        keys.push({ key: g.field as string, label: labelFor(g.field) })
      );
    if (fieldNames(columns).length === 0) {
      measures
        .filter((m) => m.field && m.aggregation)
        .forEach((m) =>
          keys.push({
            key: aggregatedColumnKey(
              m.field as string,
              m.aggregation as string
            ),
            label: `${
              AGGREGATION_LABELS[m.aggregation as Aggregation]
            } · ${labelFor(m.field)}`,
          })
        );
    }
    return keys;
  };

  const pruneSort = (keys: SortKey[]) =>
    agg.sort.filter((s) => keys.some((k) => k.key === s.key));

  const setRows = (rows: DimensionDraft[]) =>
    onChangeAgg({
      rows,
      sort: pruneSort(aggSortKeys(rows, agg.columns, agg.measures)),
    });

  const setColumns = (columns: DimensionDraft[]) =>
    onChangeAgg({
      columns,
      sort: pruneSort(aggSortKeys(agg.rows, columns, agg.measures)),
    });

  const setMeasures = (measures: MeasureDraft[]) =>
    onChangeAgg({
      measures,
      sort: pruneSort(aggSortKeys(agg.rows, agg.columns, measures)),
    });

  const rowFields = fieldNames(agg.rows);
  const columnFields = fieldNames(agg.columns);

  return (
    <>
      <DimensionList
        label="Rows"
        addLabel="Add Row"
        catalog={catalog}
        drafts={agg.rows}
        exclude={columnFields}
        onChange={setRows}
      />

      <DimensionList
        label="Columns (optional — pivot across the top)"
        addLabel="Add Column"
        catalog={catalog}
        drafts={agg.columns}
        exclude={rowFields}
        onChange={setColumns}
      />

      <div className="space-y-2">
        <Label>Measures</Label>
        {agg.measures.map((m, i) => (
          <div key={m.id} className="flex items-center gap-2">
            <div className="flex-1">
              <MeasureRefEditor
                catalog={catalog}
                type="TABLE"
                value={m}
                onChange={(next) =>
                  setMeasures(
                    agg.measures.map((x, idx) =>
                      idx === i ? { ...next, id: x.id } : x
                    )
                  )
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                setMeasures(agg.measures.filter((_, idx) => idx !== i))
              }
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() =>
            setMeasures([...agg.measures, { id: newDraftId() }])
          }
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Measure
        </Button>
      </div>

      <div>
        <Label>Sort</Label>
        <SortBuilder
          availableKeys={aggSortKeys(agg.rows, agg.columns, agg.measures)}
          value={agg.sort}
          onChange={(sort) => onChangeAgg({ sort })}
        />
      </div>
    </>
  );
}
