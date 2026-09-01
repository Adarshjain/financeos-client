'use client';

import React from 'react';

import { Label } from '@/components/ui/label';
import type { DatasourceCatalog } from '@/lib/reports.types';

import type { RawTableDraft } from '../builderReducer';
import { columnsFor, fieldByName } from '../catalog';
import { ColumnOrderEditor } from '../ColumnOrderEditor';
import { MultiSelect } from '../MultiSelect';
import type { SortKey } from '../SortBuilder';
import { SortBuilder } from '../SortBuilder';

interface RawTableConfigProps {
  catalog: DatasourceCatalog;
  raw: RawTableDraft;
  onChangeRaw: (value: Partial<RawTableDraft>) => void;
}

export function RawTableConfig({
  catalog,
  raw,
  onChangeRaw,
}: RawTableConfigProps) {
  const labelFor = (name: string | undefined) =>
    fieldByName(catalog, name)?.label ?? name ?? '';

  const columnOptions = columnsFor(catalog).map((f) => ({
    value: f.name,
    label: f.label,
  }));
  const rawSortKeys: SortKey[] = raw.columns.map((c) => ({
    key: c,
    label: labelFor(c),
  }));

  const setRawColumns = (columns: string[]) => {
    onChangeRaw({
      columns,
      sort: raw.sort.filter((s) => columns.includes(s.key)),
    });
  };

  return (
    <>
      <div>
        <Label>Columns (drag to reorder)</Label>
        <MultiSelect
          options={columnOptions}
          value={raw.columns}
          onChange={setRawColumns}
          placeholder="Select columns…"
        />
        <ColumnOrderEditor
          items={raw.columns.map((c) => ({
            key: c,
            label: labelFor(c),
          }))}
          onReorder={setRawColumns}
        />
      </div>
      <div>
        <Label>Sort</Label>
        <SortBuilder
          availableKeys={rawSortKeys}
          value={raw.sort}
          onChange={(sort) => onChangeRaw({ sort })}
        />
      </div>
    </>
  );
}
