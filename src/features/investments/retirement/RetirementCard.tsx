'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Conceal } from '@/components/ds/Conceal/Conceal';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';

import {
  type RetirementModel,
  type RetirementPartFailure,
  type RetirementTableRow,
  retirementTableRows,
} from './retirementModel';

const ch = createDataTableColumnHelper<RetirementTableRow>();

function UploadLink({ upload }: { upload: NonNullable<RetirementTableRow['upload']> }) {
  return (
    <Text variant="label" as="span">
      <Button variant="link" size="sm" asChild>
        <Link href={upload.href}>{upload.label}</Link>
      </Button>
    </Text>
  );
}

function Status({ status }: { status: NonNullable<RetirementTableRow['status']> }) {
  return <StatusWord tone={status.tone}>{status.label}</StatusWord>;
}

const columns = [
  ch.display({
    id: 'account',
    header: 'Account',
    meta: { size: 'fill', grow: 2, phone: 'main' },
    cell: ({ row }) => (
      <div className="flex flex-col min-w-0">
        <div className="flex items-baseline gap-space-6 min-w-0">
          <Text variant="body-strong" truncate>
            {row.original.name}
          </Text>
          {row.original.idLabel ? (
            <Text variant="caption" tone="ink-3">
              {row.original.idLabel}
            </Text>
          ) : null}
        </div>
        {row.original.sub ? (
          <Text variant="caption" tone="ink-3" truncate>
            {row.original.sub}
          </Text>
        ) : null}
      </div>
    ),
  }),
  ch.display({
    id: 'value',
    header: 'Value',
    meta: { size: 'md', align: 'end', phone: 'amount', wrap: true },
    cell: ({ row }) => {
      const r = row.original;
      if (r.upload) return <UploadLink upload={r.upload} />;
      return (
        <div className="flex flex-col items-end">
          <Text variant="body-strong">
            <Conceal whole>{r.valueText}</Conceal>
          </Text>
          {/* Phone: the date and status sit under the value; desktop has their own column. */}
          <div className="desk:hidden flex flex-col items-end">
            {r.updated ? (
              <Text variant="caption" tone="ink-3">
                {r.updated}
              </Text>
            ) : null}
            {r.status ? <Status status={r.status} /> : null}
          </div>
        </div>
      );
    },
  }),
  ch.display({
    id: 'updated',
    header: 'Updated',
    meta: { size: 'md', align: 'end', phone: 'hidden', wrap: true },
    cell: ({ row }) => (
      <div className="flex flex-col items-end">
        {row.original.updated ? (
          <Text variant="caption" tone="ink-3">
            {row.original.updated}
          </Text>
        ) : null}
        {row.original.status ? <Status status={row.original.status} /> : null}
      </div>
    ),
  }),
];

/** In a failed part's place: one compact line, Retry (refreshes the route), and the request reference when there is one. */
function PartFailed({ what, failure }: { what: string; failure: RetirementPartFailure }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-baseline gap-x-space-6 py-space-8">
      <Text variant="body" tone="ink-3" as="span">
        Couldn&apos;t load {what}.
      </Text>
      <Text variant="label" as="span">
        <Button variant="link" size="sm" onClick={() => router.refresh()}>
          Retry
        </Button>
      </Text>
      {failure.reference ? (
        <Text variant="caption" tone="ink-3" as="span">
          Reference {failure.reference}
        </Text>
      ) : null}
    </div>
  );
}

/** The Retirement card: one row per EPF and NPS account (an upload line for what is missing). A row opens its screen. Shown on Accounts. */
export function RetirementCard({ model }: { model: RetirementModel }) {
  const router = useRouter();
  return (
    <Card title="EPF & NPS" subtitle="EPF passbook + NPS statements">
      {model.failed?.epf ? <PartFailed what="EPF" failure={model.failed.epf} /> : null}
      <DataTable
        columns={columns}
        data={retirementTableRows(model)}
        getRowId={(row) => row.id}
        hideHeader={model.rows.length === 0}
        onRowSelect={(row) => {
          if (!row.upload) router.push(row.href);
        }}
      />
      {model.failed?.nps ? <PartFailed what="NPS" failure={model.failed.nps} /> : null}
    </Card>
  );
}

/** The card while it loads. */
export function RetirementCardSkeleton() {
  return (
    <Card title="EPF & NPS" subtitle="EPF passbook + NPS statements">
      <DataTable columns={columns} data={[]} getRowId={(row) => row.id} loading skeletonRows={2} />
    </Card>
  );
}
