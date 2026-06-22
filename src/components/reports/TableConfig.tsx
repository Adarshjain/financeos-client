'use client';

// Table configuration. A segmented control switches between raw rows and an
// aggregated PIVOT. Raw: pick (ordered) columns + sort. Aggregated: row
// dimensions (down the left) + column dimensions (across the top) + measures,
// plus sort over row-dimension names and — only when there are no column
// dimensions — the `${field}_${aggregation}` measure keys. A field can't be in
// both rows and columns. Sort entries that reference a removed key are pruned.
// Page size is a runtime concern, not part of the saved definition.

import { Plus, Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Aggregation, DatasourceCatalog } from '@/lib/reports.types';

import type {
  AggTableDraft,
  DimensionDraft,
  MeasureDraft,
  RawTableDraft,
  TableDraft,
} from './builderReducer';
import { columnsFor, fieldByName } from './catalog';
import { DimensionRefEditor } from './DimensionRefEditor';
import { AGGREGATION_LABELS } from './labels';
import { MeasureRefEditor } from './MeasureRefEditor';
import { MultiSelect } from './MultiSelect';
import { aggregatedColumnKey } from './serialize';
import type { SortKey } from './SortBuilder';
import { SortBuilder } from './SortBuilder';

interface TableConfigProps {
  catalog: DatasourceCatalog;
  value: TableDraft;
  onChange: (value: Partial<TableDraft>) => void;
  onChangeRaw: (value: Partial<RawTableDraft>) => void;
  onChangeAgg: (value: Partial<AggTableDraft>) => void;
}

const fieldNames = (drafts: DimensionDraft[]): string[] =>
  drafts.filter((d) => d.field).map((d) => d.field as string);

export function TableConfig({
  catalog,
  value,
  onChange,
  onChangeRaw,
  onChangeAgg,
}: TableConfigProps) {
  const labelFor = (name: string | undefined) =>
    fieldByName(catalog, name)?.label ?? name ?? '';

  // ---- raw ----
  const columnOptions = columnsFor(catalog).map((f) => ({
    value: f.name,
    label: f.label,
  }));
  const rawSortKeys: SortKey[] = value.raw.columns.map((c) => ({
    key: c,
    label: labelFor(c),
  }));
  const setRawColumns = (columns: string[]) => {
    onChangeRaw({
      columns,
      sort: value.raw.sort.filter((s) => columns.includes(s.key)),
    });
  };

  // ---- aggregated (pivot) ----
  const aggSortKeys = (
    rows: DimensionDraft[],
    columns: DimensionDraft[],
    measures: MeasureDraft[],
  ): SortKey[] => {
    const keys: SortKey[] = [];
    rows
      .filter((g) => g.field)
      .forEach((g) => keys.push({ key: g.field as string, label: labelFor(g.field) }));
    // A measure key is only a valid sort key when there are no column dims —
    // with columns present, "sort by measure" is ambiguous across columns.
    if (fieldNames(columns).length === 0) {
      measures
        .filter((m) => m.field && m.aggregation)
        .forEach((m) =>
          keys.push({
            key: aggregatedColumnKey(m.field as string, m.aggregation as string),
            label: `${AGGREGATION_LABELS[m.aggregation as Aggregation]} · ${labelFor(m.field)}`,
          }),
        );
    }
    return keys;
  };
  const pruneSort = (keys: SortKey[]) =>
    value.agg.sort.filter((s) => keys.some((k) => k.key === s.key));

  const setRows = (rows: DimensionDraft[]) =>
    onChangeAgg({
      rows,
      sort: pruneSort(aggSortKeys(rows, value.agg.columns, value.agg.measures)),
    });
  const setColumns = (columns: DimensionDraft[]) =>
    onChangeAgg({
      columns,
      sort: pruneSort(aggSortKeys(value.agg.rows, columns, value.agg.measures)),
    });
  const setMeasures = (measures: MeasureDraft[]) =>
    onChangeAgg({
      measures,
      sort: pruneSort(aggSortKeys(value.agg.rows, value.agg.columns, measures)),
    });

  const rowFields = fieldNames(value.agg.rows);
  const columnFields = fieldNames(value.agg.columns);

  return (
    <div className="space-y-4">
      <Tabs
        className="w-full"
        value={value.tableMode}
        onValueChange={(v) =>
          onChange({ tableMode: v as 'raw' | 'aggregated' })
        }
      >
        <TabsList className="w-full">
          <TabsTrigger className="w-full" value="raw">Raw rows</TabsTrigger>
          <TabsTrigger className="w-full" value="aggregated">Aggregated</TabsTrigger>
        </TabsList>
      </Tabs>

      {value.tableMode === 'raw' ? (
        <>
          <div>
            <Label>Columns (selection order = column order)</Label>
            <MultiSelect
              options={columnOptions}
              value={value.raw.columns}
              onChange={setRawColumns}
              placeholder="Select columns…"
            />
          </div>
          <div>
            <Label>Sort</Label>
            <SortBuilder
              availableKeys={rawSortKeys}
              value={value.raw.sort}
              onChange={(sort) => onChangeRaw({ sort })}
            />
          </div>
        </>
      ) : (
        <>
          <DimensionList
            label="Rows"
            addLabel="Add Row"
            catalog={catalog}
            drafts={value.agg.rows}
            exclude={columnFields}
            onChange={setRows}
          />

          <DimensionList
            label="Columns (optional — pivot across the top)"
            addLabel="Add Column"
            catalog={catalog}
            drafts={value.agg.columns}
            exclude={rowFields}
            onChange={setColumns}
          />

          <div className="space-y-2">
            <Label>Measures</Label>
            {value.agg.measures.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <MeasureRefEditor
                    catalog={catalog}
                    type="TABLE"
                    value={m}
                    onChange={(next) =>
                      setMeasures(
                        value.agg.measures.map((x, idx) => (idx === i ? next : x)),
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setMeasures(value.agg.measures.filter((_, idx) => idx !== i))
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
              onClick={() => setMeasures([...value.agg.measures, {}])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Measure
            </Button>
          </div>

          <div>
            <Label>Sort</Label>
            <SortBuilder
              availableKeys={aggSortKeys(
                value.agg.rows,
                value.agg.columns,
                value.agg.measures,
              )}
              value={value.agg.sort}
              onChange={(sort) => onChangeAgg({ sort })}
            />
          </div>
        </>
      )}
    </div>
  );
}

interface DimensionListProps {
  label: string;
  addLabel: string;
  catalog: DatasourceCatalog;
  drafts: DimensionDraft[];
  exclude: string[];
  onChange: (drafts: DimensionDraft[]) => void;
}

// A reusable add/remove list of dimension pickers (used for rows and columns).
function DimensionList({
  label,
  addLabel,
  catalog,
  drafts,
  exclude,
  onChange,
}: DimensionListProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {drafts.map((g, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex-1">
            <DimensionRefEditor
              catalog={catalog}
              type="TABLE"
              value={g}
              exclude={exclude}
              onChange={(next) =>
                onChange(drafts.map((x, idx) => (idx === i ? next : x)))
              }
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(drafts.filter((_, idx) => idx !== i))}
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
        onClick={() => onChange([...drafts, {}])}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}
