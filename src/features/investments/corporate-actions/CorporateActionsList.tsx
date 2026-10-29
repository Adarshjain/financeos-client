'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Badge,
  Button,
  Card,
  CardRow,
  Conceal,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  FilterBar,
  FilterChip,
  Icon,
  Pager,
  Select,
  Text,
} from '@/components/ds';
import { useSearchText } from '@/features/shell/useSearchText';
import type { CorporateActionItem } from '@/lib/investments.types';

import { CorporateActionDialog } from './CorporateActionDialog';
import {
  APPLY_RULES,
  CORPORATE_ACTIONS_SIZE_OPTIONS,
  type CorporateActionListRow,
  corporateActionListRow,
  corporateActionsUrl,
  type CorporateActionsUrlState,
  SORT_OPTIONS,
  TYPE_CHIPS,
} from './corporateActionsModel';

const ch = createDataTableColumnHelper<CorporateActionListRow>();

function columns(onEdit: (row: CorporateActionListRow) => void) {
  return [
    ch.display({
      id: 'date',
      header: 'Ex date',
      meta: { size: 'sm', phone: 'hidden' },
      cell: ({ row }) => <Text variant="body">{row.original.date}</Text>,
    }),
    ch.display({
      id: 'instrument',
      header: 'Instrument',
      meta: { size: 'fill', grow: 2, wrap: true, phone: 'main' },
      cell: ({ row }) => (
        <div className="flex flex-col min-w-0">
          <Text variant="body-strong" truncate>
            {row.original.title}
          </Text>
          {row.original.detail ? (
            <Text variant="label" tone="ink-3" truncate className="max-desk:hidden">
              {row.original.detail}
            </Text>
          ) : null}
        </div>
      ),
    }),
    ch.display({
      id: 'type',
      header: 'Type',
      meta: { size: 'sm', phone: 'status' },
      cell: ({ row }) => (
        <Badge tone="info" size="sm">
          {row.original.typeLabel}
        </Badge>
      ),
    }),
    ch.display({
      id: 'ratio',
      header: 'Ratio',
      meta: { size: 'sm', phone: 'hidden' },
      cell: ({ row }) => <Text variant="body">{row.original.ratio}</Text>,
    }),
    ch.display({
      id: 'effect',
      header: 'Effect',
      meta: { size: 'lg', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone={row.original.effect ? 'ink' : 'ink-3'}>
          {row.original.effect || '—'}
          {row.original.cost ? <Conceal>{` · ${row.original.cost}`}</Conceal> : null}
        </Text>
      ),
    }),
    ch.display({
      id: 'edit',
      header: '',
      meta: { size: 'xs', align: 'end', phone: 'hidden' },
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={`Edit ${row.original.title} ${row.original.typeLabel}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row.original);
          }}
        >
          <Icon name="pencil-simple" size="sm" />
        </Button>
      ),
    }),
  ];
}

/** The second line of a phone row: the note, then "ex 10 Jun 25 · 1:1 · 30 → 60 shares". */
function PhoneSub({ row }: { row: CorporateActionListRow }) {
  return (
    <div className="flex flex-col min-w-0">
      {row.detail ? (
        <Text variant="label" tone="ink-3" truncate>
          {row.detail}
        </Text>
      ) : null}
      <Text variant="label" tone="ink-3" truncate>
        <Conceal>{row.phoneLine}</Conceal>
      </Text>
    </div>
  );
}

export interface CorporateActionsListProps {
  state: CorporateActionsUrlState;
  items: CorporateActionItem[];
  totalElements: number;
  totalPages: number;
}

/** The search, type chips and sort over the recorded actions, the rules card and the edit dialog. Every control is one URL change. */
export function CorporateActionsList({ state, items, totalElements, totalPages }: CorporateActionsListProps) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<CorporateActionItem | null>(null);
  const go = (next: Partial<CorporateActionsUrlState>) => router.push(corporateActionsUrl({ ...state, ...next }), { scroll: false });
  const { text, setText } = useSearchText(state.q, (q) => go({ q, page: 0 }));

  const rows = React.useMemo(() => items.map(corporateActionListRow), [items]);
  const tableColumns = React.useMemo(() => columns((row) => setEditing(row.item)), []);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === state.sort)?.label ?? SORT_OPTIONS[0].label;
  const filtered = state.q !== '' || state.type !== '';

  const pager = (
    <Pager
      variant="compact"
      page={state.page}
      size={state.size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="actions"
      sizeOptions={CORPORATE_ACTIONS_SIZE_OPTIONS}
      sizeLabel={(n) => `${n} / page`}
      onPageChange={(page) => go({ page })}
      onSizeChange={(size) => go({ size, page: 0 })}
    />
  );

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <FilterBar search={{ value: text, onValueChange: setText }}>
        {TYPE_CHIPS.map((chip) => (
          <FilterChip key={chip.value || 'all'} className="shrink-0" selected={state.type === chip.value} onClick={() => go({ type: chip.value, page: 0 })}>
            {chip.label}
          </FilterChip>
        ))}
        <Select
          value={state.sort}
          options={SORT_OPTIONS}
          onValueChange={(v) => go({ sort: v as CorporateActionsUrlState['sort'], page: 0 })}
          trigger={
            <FilterChip hasDropdown className="shrink-0">
              {sortLabel}
            </FilterChip>
          }
        />
      </FilterBar>
      <Card>
        <DataTable
          columns={tableColumns}
          data={rows}
          getRowId={(row) => row.id}
          pager={pager}
          phoneSub={(row) => <PhoneSub row={row} />}
          onRowSelect={(row) => setEditing(row.item)}
          empty={
            <EmptyState
              compact
              description={filtered ? 'No corporate actions match' : 'No corporate actions yet. Splits, bonus issues, demergers and mergers show here.'}
              action={filtered ? { label: 'Clear filters', variant: 'link', href: corporateActionsUrl({ ...state, q: '', type: '', page: 0 }) } : undefined}
            />
          }
          stickyHeader={false}
        />
      </Card>
      <Card title="How each type is applied" subtitle="So XIRR and gains stay honest">
        {APPLY_RULES.map((rule) => (
          <CardRow key={rule.label} className="items-baseline">
            <Text variant="body" tone="ink-3" as="div" className="w-1/3 shrink-0 desk:w-48">
              {rule.label}
            </Text>
            <Text variant="body" align="end" as="div" className="flex-1 min-w-0">
              {rule.text}
            </Text>
          </CardRow>
        ))}
      </Card>
      {editing ? <CorporateActionDialog key={editing.id} action={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

/** The list while the page loads. */
export function CorporateActionsSkeleton() {
  return (
    <Card>
      <DataTable columns={columns(() => undefined)} data={[]} getRowId={(row) => row.id} loading skeletonRows={8} />
    </Card>
  );
}
