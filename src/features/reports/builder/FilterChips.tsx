'use client';

import React from 'react';

import { Button, FilterChip, Popover, Text } from '@/components/ds';
import { buildFilter } from '@/lib/reports.helpers';
import type { DatasourceCatalog, FilterClause } from '@/lib/reports.types';

import { type DynamicOptions, fieldByName, filterableFields, operatorsForField, valueKind } from './catalog';
import { defaultFilterClause } from './filterClause';
import { describeFilter } from './filterLabel';
import { FilterValueEditor } from './FilterValueEditor';
import { humanizeToken } from './labels';
import { FieldError, PAIR, PickSelect } from './pickers';
import { isFilterComplete } from './serialize';

/** One filter's editor: field, operator, then the value editor that pair needs. */
function FilterForm({
  catalog,
  dynamicOptions,
  clause,
  onChange,
}: {
  catalog: DatasourceCatalog;
  dynamicOptions: DynamicOptions;
  clause: FilterClause;
  onChange: (clause: FilterClause) => void;
}) {
  const field = fieldByName(catalog, clause.field);
  const kind = field ? valueKind(catalog, field, clause.operator) : 'none';
  return (
    <div className="flex flex-col gap-space-12 p-space-12 w-container-xs max-w-full">
      <div className={PAIR}>
        <PickSelect
          label="Field"
          value={clause.field}
          searchable
          options={filterableFields(catalog).map((f) => ({ value: f.name, label: f.label }))}
          onValueChange={(name) => {
            const next = fieldByName(catalog, name);
            if (next) onChange(defaultFilterClause(catalog, next, operatorsForField(catalog, next)[0] ?? ''));
          }}
        />
        <PickSelect
          label="Operator"
          value={clause.operator}
          options={(field ? operatorsForField(catalog, field) : []).map((op) => ({ value: op, label: humanizeToken(op) }))}
          onValueChange={(operator) => field && operator && onChange(defaultFilterClause(catalog, field, operator))}
        />
      </div>
      {field ? (
        <FilterValueEditor
          kind={kind}
          field={field}
          dynamicOptions={dynamicOptions}
          value={clause.value}
          onChange={(value) => onChange(buildFilter(clause.field, clause.operator, value))}
        />
      ) : null}
    </div>
  );
}

interface FilterChipsProps {
  catalog: DatasourceCatalog;
  dynamicOptions: DynamicOptions;
  filters: FilterClause[];
  error?: string;
  onAdd: (clause: FilterClause) => void;
  onUpdate: (index: number, clause: FilterClause) => void;
  onRemove: (index: number) => void;
}

/** The first filterable field, with its first operator, as the clause a new filter starts from. */
function blankClause(catalog: DatasourceCatalog): FilterClause | null {
  const field = filterableFields(catalog)[0];
  return field ? defaultFilterClause(catalog, field, operatorsForField(catalog, field)[0] ?? '') : null;
}

/** The filters as chips: each is removable and opens its editor in a dropdown; "Add filter" opens the same editor for a new one. */
export function FilterChips({ catalog, dynamicOptions, filters, error, onAdd, onUpdate, onRemove }: FilterChipsProps) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState<FilterClause | null>(null);

  const openAdd = (open: boolean) => {
    setAdding(open);
    if (open) setDraft(blankClause(catalog));
  };

  return (
    <div className="flex flex-col gap-space-8">
      <div className="flex gap-space-8 overflow-x-auto desk:flex-wrap pb-space-2">
        {filters.map((clause, i) => (
          <div key={i} className="shrink-0">
            <Popover
              contentProps={{ 'aria-label': `Edit filter ${fieldByName(catalog, clause.field)?.label ?? clause.field}` }}
              trigger={
                <FilterChip hasDropdown removable selected onRemove={() => onRemove(i)}>
                  {describeFilter(catalog, clause, dynamicOptions)}
                </FilterChip>
              }
            >
              <FilterForm catalog={catalog} dynamicOptions={dynamicOptions} clause={clause} onChange={(c) => onUpdate(i, c)} />
              <div className="flex justify-end p-space-12 pt-0">
                <Popover.Close asChild>
                  <Button variant="primary" size="sm">
                    Done
                  </Button>
                </Popover.Close>
              </div>
            </Popover>
          </div>
        ))}
        <div className="shrink-0">
          <Popover
            open={adding}
            onOpenChange={openAdd}
            trigger={<FilterChip variant="dashed">Add filter</FilterChip>}
          >
            {draft ? (
              <>
                <FilterForm catalog={catalog} dynamicOptions={dynamicOptions} clause={draft} onChange={setDraft} />
                <div className="flex justify-end p-space-12 pt-0">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!isFilterComplete(catalog, draft)}
                    onClick={() => {
                      onAdd(draft);
                      setAdding(false);
                    }}
                  >
                    Apply filter
                  </Button>
                </div>
              </>
            ) : (
              <Text variant="body" tone="ink-3" as="p">
                This datasource has no fields to filter by.
              </Text>
            )}
          </Popover>
        </div>
      </div>
      {error ? <FieldError message={error} /> : null}
    </div>
  );
}
