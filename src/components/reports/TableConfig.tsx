'use client';

// Table configuration. A segmented control switches between raw rows and an
// aggregated PIVOT. Raw: pick (ordered) columns + sort. Aggregated: row
// dimensions (down the left) + column dimensions (across the top) + measures,
// plus sort over row-dimension names and — only when there are no column
// dimensions — the `${field}_${aggregation}` measure keys. A field can't be in
// both rows and columns. Sort entries that reference a removed key are pruned.
// Page size is a runtime concern, not part of the saved definition.

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DatasourceCatalog } from '@/lib/reports.types';

import type {
  AggTableDraft,
  RawTableDraft,
  TableDraft,
} from './builderReducer';
import { AggTableConfig } from './table-config/AggTableConfig';
import { RawTableConfig } from './table-config/RawTableConfig';

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
  return (
    <div className="space-y-2">
      <Tabs
        className="w-full"
        value={value.tableMode}
        onValueChange={(v) =>
          onChange({ tableMode: v as 'raw' | 'aggregated' })
        }
      >
        <TabsList className="w-full">
          <TabsTrigger className="w-full" value="raw">
            Raw rows
          </TabsTrigger>
          <TabsTrigger className="w-full" value="aggregated">
            Aggregated
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {value.tableMode === 'raw' ? (
        <RawTableConfig
          catalog={catalog}
          raw={value.raw}
          onChangeRaw={onChangeRaw}
        />
      ) : (
        <AggTableConfig
          catalog={catalog}
          agg={value.agg}
          onChangeAgg={onChangeAgg}
        />
      )}
    </div>
  );
}
