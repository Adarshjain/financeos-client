'use client';

// Table configuration. A segmented control switches between raw rows and
// aggregated rows. Raw: pick (ordered) columns + sort + page size. Aggregated:
// group-by dimensions + measures + sort (over group-by names and the
// `${field}_${aggregation}` measure keys) + page size. Sort entries that
// reference a removed column/measure are pruned automatically.

import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const setColumns = (columns: string[]) => {
    onChangeRaw({
      columns,
      sort: value.raw.sort.filter((s) => columns.includes(s.key)),
    });
  };

  // ---- aggregated ----
  const aggSortKeys = (
    groupBy: DimensionDraft[],
    measures: MeasureDraft[],
  ): SortKey[] => {
    const keys: SortKey[] = [];
    groupBy
      .filter((g) => g.field)
      .forEach((g) => keys.push({ key: g.field as string, label: labelFor(g.field) }));
    measures
      .filter((m) => m.field && m.aggregation)
      .forEach((m) =>
        keys.push({
          key: aggregatedColumnKey(m.field as string, m.aggregation as string),
          label: `${AGGREGATION_LABELS[m.aggregation as Aggregation]} · ${labelFor(m.field)}`,
        }),
      );
    return keys;
  };
  const pruneSort = (keys: SortKey[]) =>
    value.agg.sort.filter((s) => keys.some((k) => k.key === s.key));

  const setGroupBy = (groupBy: DimensionDraft[]) =>
    onChangeAgg({ groupBy, sort: pruneSort(aggSortKeys(groupBy, value.agg.measures)) });
  const setMeasures = (measures: MeasureDraft[]) =>
    onChangeAgg({ measures, sort: pruneSort(aggSortKeys(value.agg.groupBy, measures)) });

  const parsePageSize = (raw: string, fallback: number) => {
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? fallback : Math.max(1, n);
  };

  return (
    <div className="space-y-4">
      <Tabs
        value={value.tableMode}
        onValueChange={(v) =>
          onChange({ tableMode: v as 'raw' | 'aggregated' })
        }
      >
        <TabsList>
          <TabsTrigger value="raw">Raw rows</TabsTrigger>
          <TabsTrigger value="aggregated">Aggregated</TabsTrigger>
        </TabsList>
      </Tabs>

      {value.tableMode === 'raw' ? (
        <>
          <div>
            <Label>Columns (selection order = column order)</Label>
            <MultiSelect
              options={columnOptions}
              value={value.raw.columns}
              onChange={setColumns}
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
          <div>
            <Label>Page size</Label>
            <Input
              type="number"
              min={1}
              value={String(value.raw.pageSize)}
              onChange={(e) =>
                onChangeRaw({
                  pageSize: parsePageSize(e.currentTarget.value, value.raw.pageSize),
                })
              }
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Group by</Label>
            {value.agg.groupBy.map((g, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <DimensionRefEditor
                    catalog={catalog}
                    type="TABLE"
                    value={g}
                    onChange={(next) =>
                      setGroupBy(
                        value.agg.groupBy.map((x, idx) => (idx === i ? next : x)),
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setGroupBy(value.agg.groupBy.filter((_, idx) => idx !== i))
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGroupBy([...value.agg.groupBy, {}])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add group-by
            </Button>
          </div>

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
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMeasures([...value.agg.measures, {}])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add measure
            </Button>
          </div>

          <div>
            <Label>Sort</Label>
            <SortBuilder
              availableKeys={aggSortKeys(value.agg.groupBy, value.agg.measures)}
              value={value.agg.sort}
              onChange={(sort) => onChangeAgg({ sort })}
            />
          </div>
          <div>
            <Label>Page size</Label>
            <Input
              type="number"
              min={1}
              value={String(value.agg.pageSize)}
              onChange={(e) =>
                onChangeAgg({
                  pageSize: parsePageSize(e.currentTarget.value, value.agg.pageSize),
                })
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
