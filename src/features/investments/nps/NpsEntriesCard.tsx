'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Conceal } from '@/components/ds/Conceal/Conceal';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { FilterBar } from '@/components/ds/FilterBar/FilterBar';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { Hero } from '@/components/ds/Hero/Hero';
import { Pager } from '@/components/ds/Pager/Pager';
import { Select } from '@/components/ds/Select/Select';
import { StatusWords } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { appHref } from '@/features/shell/routes';
import { todayInAppZone } from '@/lib/date-range';

import { FilterRowSkeleton } from '../FilterRowSkeleton';
import { NPS_UPLOAD_HREF } from './npsImportModel';
import { CONTRIBUTOR_OPTIONS, FILTER_TYPE_OPTIONS, fyOptions, NPS_SIZE_OPTIONS, type NpsEntryRow, npsUrl, type NpsUrlState } from './npsModel';

const ch = createDataTableColumnHelper<NpsEntryRow>();

const TIER_OPTIONS = [
  { value: '', label: 'All tiers' },
  { value: 'I', label: 'Tier I' },
  { value: 'II', label: 'Tier II' },
];

const columns = [
  ch.display({ id: 'date', header: 'Date', meta: { size: 'sm', phone: 'hidden' }, cell: ({ row }) => <Text variant="body">{row.original.date}</Text> }),
  ch.display({
    id: 'entry',
    header: 'Entry',
    meta: { size: 'fill', grow: 2, phone: 'main' },
    cell: ({ row }) => (
      <>
        <Text variant="body-strong" as="div" truncate className="desk:hidden" tone={row.original.muted ? 'ink-3' : undefined}>
          {row.original.title}
        </Text>
        <Text variant="body" as="div" truncate className="max-desk:hidden" tone={row.original.muted ? 'ink-3' : undefined}>
          {row.original.title}
        </Text>
      </>
    ),
  }),
  ch.display({ id: 'tier', header: 'Tier', meta: { size: 'sm', phone: 'hidden' }, cell: ({ row }) => <Text variant="body">{row.original.tier}</Text> }),
  ch.display({ id: 'units', header: 'Units', meta: { size: 'md', align: 'end', phone: 'hidden' }, cell: ({ row }) => <Text variant="body">{row.original.units}</Text> }),
  ch.display({
    id: 'amount',
    header: 'Amount',
    meta: { size: 'sm', align: 'end', phone: 'amount' },
    cell: ({ row }) => (
      <>
        <Text variant="body-strong" as="div" className="desk:hidden">
          <Conceal whole>{row.original.amount}</Conceal>
        </Text>
        <Text variant="body" as="div" className="max-desk:hidden">
          <Conceal whole>{row.original.amount}</Conceal>
        </Text>
        <Text variant="caption" tone="ink-3" as="div" className="desk:hidden">
          {row.original.units} units
        </Text>
      </>
    ),
  }),
  ch.display({
    id: 'source',
    header: 'Source',
    meta: { size: 'md', phone: 'hidden' },
    cell: ({ row }) => (
      <StatusWords
        items={[
          { label: row.original.source },
          ...(row.original.transactionId
            ? [{ tone: 'info' as const, label: <Link href={appHref(`/transactions?txn=${row.original.transactionId}`)} prefetch={false}>Linked</Link> }]
            : []),
          ...(row.original.status ? [{ label: row.original.status }] : []),
        ]}
      />
    ),
  }),
];

export interface NpsEntriesCardProps {
  state: NpsUrlState;
  /** The FY the ledger shows (undefined = all years). */
  fy: number | undefined;
  rows: NpsEntryRow[];
  totalElements: number;
  totalPages: number;
  accountOptions: { value: string; label: string }[];
  accountValue: string;
  onRecord: () => void;
}

/** The ledger: account, tier and type filters, and the paged table of entries. Every control is one URL change. */
export function NpsEntriesCard({ state, fy, rows, totalElements, totalPages, accountOptions, accountValue, onRecord }: NpsEntriesCardProps) {
  const router = useRouter();
  const go = (next: Partial<NpsUrlState>) => router.push(npsUrl({ ...state, ...next }), { scroll: false });
  const pager = (
    <Pager
      page={state.page}
      size={state.size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="entries"
      sizeOptions={NPS_SIZE_OPTIONS}
      sizeLabel={(n) => `${n} / page`}
      onPageChange={(page) => go({ page })}
      onSizeChange={(size) => go({ size, page: 0 })}
    />
  );
  const today = todayInAppZone();
  const fyChoices = fyOptions(today, fy);
  const fyValue = fy === undefined ? 'all' : String(fy);
  const fyLabelText = fyChoices.find((o) => o.value === fyValue)?.label ?? 'FY';
  const contributorLabel = CONTRIBUTOR_OPTIONS.find((o) => o.value === state.contributor)?.label ?? 'From';
  const changed = state.account !== '' || state.fy !== null || state.contributor !== '' || state.tier !== '' || state.type !== '';
  const reset = { account: '', fy: null, contributor: '' as const, tier: '' as const, type: '' as const, page: 0 };
  const accountLabel = accountOptions.find((o) => o.value === accountValue)?.label ?? 'Account';
  const tierLabel = TIER_OPTIONS.find((o) => o.value === state.tier)?.label ?? 'Tier';
  const typeLabel = FILTER_TYPE_OPTIONS.find((o) => o.value === state.type)?.label ?? 'Type';
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <FilterBar changed={changed} onReset={() => go(reset)}>
        {accountOptions.length > 0 ? (
          <Select
            options={accountOptions}
            value={accountValue}
            onValueChange={(v) => go({ account: v as string, page: 0 })}
            trigger={
              <FilterChip hasDropdown changed={state.account !== ''} onReset={() => go({ account: '', page: 0 })} className="shrink-0">
                {accountLabel}
              </FilterChip>
            }
          />
        ) : null}
        <Select
          options={fyChoices}
          value={fyValue}
          onValueChange={(v) => go({ fy: v === 'all' ? 'all' : Number(v), page: 0 })}
          trigger={
            <FilterChip hasDropdown changed={state.fy !== null} onReset={() => go({ fy: null, page: 0 })} className="shrink-0">
              {fyLabelText}
            </FilterChip>
          }
        />
        <Select
          options={CONTRIBUTOR_OPTIONS}
          value={state.contributor}
          onValueChange={(v) => go({ contributor: v as NpsUrlState['contributor'], page: 0 })}
          trigger={
            <FilterChip hasDropdown changed={state.contributor !== ''} onReset={() => go({ contributor: '', page: 0 })} className="shrink-0">
              {contributorLabel}
            </FilterChip>
          }
        />
        <Select
          options={TIER_OPTIONS}
          value={state.tier}
          onValueChange={(v) => go({ tier: v as NpsUrlState['tier'], page: 0 })}
          trigger={
            <FilterChip hasDropdown changed={state.tier !== ''} onReset={() => go({ tier: '', page: 0 })} className="shrink-0">
              {tierLabel}
            </FilterChip>
          }
        />
        <Select
          options={FILTER_TYPE_OPTIONS}
          value={state.type}
          onValueChange={(v) => go({ type: v as NpsUrlState['type'], page: 0 })}
          trigger={
            <FilterChip hasDropdown changed={state.type !== ''} onReset={() => go({ type: '', page: 0 })} className="shrink-0">
              {typeLabel}
            </FilterChip>
          }
        />
      </FilterBar>
      <Card
        data-testid="nps-entries"
        title="Entries"
        action={
          <span className="flex items-center gap-space-12">
            <Text variant="label" as="span">
              <Button variant="link" size="sm" onClick={onRecord}>
                Record entry
              </Button>
            </Text>
            <Text variant="label" as="span">
              <Button variant="link" size="sm" asChild>
                <Link href={NPS_UPLOAD_HREF}>Upload statement</Link>
              </Button>
            </Text>
          </span>
        }
      >
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          pager={pager}
          dayHeader={(row) => ({ key: row.day, label: row.date, sublabel: row.weekday })}
          phoneSub={(row) => (
            <Text variant="label" tone="ink-3" as="div">
              {row.context}
              {row.transactionId ? (
                <>
                  {' · '}
                  <Link href={appHref(`/transactions?txn=${row.transactionId}`)} prefetch={false}>
                    Linked
                  </Link>
                </>
              ) : null}
            </Text>
          )}
          getRowCanExpand={(row) => row.lines.length > 0}
          renderExpanded={(row) => (
            <div className="flex flex-col gap-space-4 px-space-16 py-space-8">
              {row.lines.map((l) => (
                <div key={l.id} className="flex justify-between gap-space-12">
                  <Text variant="label" tone="ink-2" as="span" truncate>
                    {l.name}
                  </Text>
                  <Text variant="label" as="span">
                    {l.units} units
                  </Text>
                </div>
              ))}
            </div>
          )}
          empty={
            <EmptyState
              title="No entries here"
              description="Try another year, tier or type."
              action={{ label: 'Clear filters', variant: 'secondary', onSelect: () => go(reset) }}
            />
          }
          stickyHeader={false}
          size="sm"
        />
      </Card>
    </div>
  );
}

/** The hero, filter row and table while the page loads. */
export function NpsEntriesSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Hero.Skeleton label change figures={3} />
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <FilterRowSkeleton chips={3} />
        <Card>
          <DataTable columns={columns} data={[]} getRowId={(row) => row.id} size="sm" loading skeletonRows={5} />
        </Card>
      </div>
    </div>
  );
}
