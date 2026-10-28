'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Banner,
  Button,
  Card,
  Conceal,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  FilterBar,
  FilterChip,
  Pager,
  Select,
  Text,
} from '@/components/ds';

import { INVESTMENTS_IMPORT_HREF } from '../investmentsTabs';
import {
  EPF_IMPORT_TYPE,
  EPF_SIZE_OPTIONS,
  type EpfRow,
  epfUrl,
  type EpfUrlState,
  monthYear,
} from './epfModel';

export const EPF_UPLOAD_HREF = `${INVESTMENTS_IMPORT_HREF}?type=${EPF_IMPORT_TYPE}`;

const ch = createDataTableColumnHelper<EpfRow>();

const money = (value: string, tone?: 'ink-3') => (
  <Text variant="body" tone={tone}>
    <Conceal whole>{value}</Conceal>
  </Text>
);

/** Desktop shows one line per entry like Transactions: the wage month, the particulars and one column per share; phone stacks the title, its line, the amount and the balance. */
const columns = [
  ch.display({
    id: 'wageMonth',
    header: 'Wage month',
    meta: { size: 'sm', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body">{row.original.wageMonth}</Text>,
  }),
  ch.display({
    id: 'particulars',
    header: 'Particulars',
    meta: { size: 'fill', grow: 2, phone: 'main' },
    cell: ({ row }) => (
      <>
        <Text variant="body-strong" as="div" className="desk:hidden" truncate>
          {row.original.phoneTitle}
        </Text>
        <Text variant="body" as="div" className="max-desk:hidden" truncate>
          {row.original.title}
        </Text>
      </>
    ),
  }),
  ch.display({
    id: 'employee',
    header: 'Your share',
    // On phone this cell is the row's amount, beside the title.
    meta: { size: 'sm', align: 'end', phone: 'amount' },
    cell: ({ row }) => (
      <>
        <Text
          variant="body-strong"
          tone={row.original.amountTone}
          as="div"
          className="desk:hidden"
        >
          <Conceal whole>{row.original.amount}</Conceal>
        </Text>
        <Text variant="body" as="div" className="max-desk:hidden">
          <Conceal whole>{row.original.employee}</Conceal>
        </Text>
      </>
    ),
  }),
  ch.display({
    id: 'employer',
    header: 'Employer',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => money(row.original.employer),
  }),
  ch.display({
    id: 'pension',
    header: 'Pension',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => money(row.original.pension, 'ink-3'),
  }),
  ch.display({
    id: 'balance',
    header: 'Balance',
    // On phone the balance sits on the second line, under the amount, like Transactions.
    meta: { size: 'sm', align: 'end', phone: 'status' },
    cell: ({ row }) => (
      <>
        <Text variant="caption" tone="ink-3" as="div" className="desk:hidden">
          <Conceal whole>{row.original.amountSub}</Conceal>
        </Text>
        <Text variant="body-strong" as="div" className="max-desk:hidden">
          <Conceal whole>{row.original.balance}</Conceal>
        </Text>
      </>
    ),
  }),
];

export interface EpfPassbookCardProps {
  state: EpfUrlState;
  rows: EpfRow[];
  totalElements: number;
  totalPages: number;
  subtitle: string;
  fyOptions: { value: string; label: string }[];
  fyValue: string;
  /** The employers to choose between, or an empty list when there is only one. */
  employerOptions: { value: string; label: string }[];
  employerValue: string;
  /** The wage month the passbook stops at when it is out of date, with the months it is missing. */
  stale: { through: string; missing: string } | null;
  onOpen: (id: string) => void;
}

/** The passbook: the FY and employer choices, an out-of-date note, and the paged table of entries. Every control is one URL change. */
export function EpfPassbookCard({
  state,
  rows,
  totalElements,
  totalPages,
  subtitle,
  fyOptions,
  fyValue,
  employerOptions,
  employerValue,
  stale,
  onOpen,
}: EpfPassbookCardProps) {
  const router = useRouter();
  const go = (next: Partial<EpfUrlState>) =>
    router.push(epfUrl({ ...state, ...next }), { scroll: false });

  const pager = (
    <Pager
      page={state.page}
      size={state.size}
      totalElements={totalElements}
      totalPages={totalPages}
      unit="entries"
      sizeOptions={EPF_SIZE_OPTIONS}
      sizeLabel={(n) => `${n} / page`}
      onPageChange={(page) => go({ page })}
      onSizeChange={(size) => go({ size, page: 0 })}
    />
  );

  const fyLabel = fyOptions.find((o) => o.value === fyValue)?.label ?? 'FY';
  const employerLabel =
    employerOptions.find((o) => o.value === employerValue)?.label ?? 'Employer';

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <FilterBar>
        {employerOptions.length > 0 ? (
          <Select
            options={employerOptions}
            value={employerValue}
            // The year shown stays put: a new employer keeps it rather than jumping to its own newest year.
            onValueChange={(v) =>
              go({
                employer: v as string,
                fy: fyValue === 'all' ? 'all' : Number(fyValue),
                page: 0,
              })
            }
            trigger={
              <FilterChip hasDropdown selected className="shrink-0">
                {employerLabel}
              </FilterChip>
            }
          />
        ) : null}
        <Select
          options={fyOptions}
          value={fyValue}
          onValueChange={(v) =>
            go({ fy: v === 'all' ? 'all' : Number(v), page: 0 })
          }
          trigger={
            <FilterChip hasDropdown selected className="shrink-0">
              {fyLabel}
            </FilterChip>
          }
        />
      </FilterBar>
      <Card
        title="Passbook"
        subtitle={subtitle}
        action={
          <Text variant="label" as="span">
            <Button variant="link" size="sm" asChild>
              <Link href={EPF_UPLOAD_HREF}>Upload passbook</Link>
            </Button>
          </Text>
        }
      >
        {stale ? (
          <Banner
            tone="warning"
            rounded="md"
            className="mx-space-16 mb-space-12"
            action={{
              label: 'Upload passbook',
              onSelect: () => router.push(EPF_UPLOAD_HREF),
            }}
          >
            {`Your passbook is up to ${monthYear(stale.through)}. Upload a newer one to bring in ${stale.missing || 'the latest months'}.`}
          </Banner>
        ) : null}
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          pager={pager}
          phoneSub={(row) =>
            row.split ? (
              <div className="flex min-w-0 gap-space-4">
                <Text variant="label" tone="ink-3" className="shrink-0">
                  <Conceal>{`You ${row.split.you} ·`}</Conceal>
                </Text>
                <Text variant="label" tone="ink-3" truncate>
                  {row.split.employerName}
                </Text>
                <Text variant="label" tone="ink-3" className="shrink-0">
                  <Conceal>{row.split.employer}</Conceal>
                </Text>
              </div>
            ) : (
              <Text variant="label" tone="ink-3" as="div">
                <Conceal>{row.phoneSub}</Conceal>
              </Text>
            )
          }
          onRowSelect={(row) => onOpen(row.id)}
          empty={
            <EmptyState compact description="No entries in this period." />
          }
          stickyHeader={false}
          size="sm"
        />
      </Card>
    </div>
  );
}

/** The table while the page loads. */
export function EpfPassbookSkeleton() {
  return (
    <Card>
      <DataTable
        columns={columns}
        data={[]}
        getRowId={(row) => row.id}
        size="sm"
        loading
        skeletonRows={5}
      />
    </Card>
  );
}
