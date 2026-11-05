'use client';

import Link from 'next/link';
import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { LoadError } from '@/features/shell/LoadError';

import { settingsSection } from '../settingsSections';
import { LocalFailuresCard } from './LocalFailuresCard';
import { LookupCard } from './LookupCard';
import { RequestCard } from './RequestCard';
import { RootCauseCard } from './RootCauseCard';
import { TimelineCard } from './TimelineCard';
import { useDebugRef } from './useDebugRef';
import { useDiagnosticsLookup } from './useDiagnosticsLookup';

interface DebugScreenProps {
  initialRef?: string;
  initialType?: string;
  admin: boolean;
  /** An explicit failures admin: shows the Failures entry. */
  failuresAdmin?: boolean;
}

/** The Debug tab: the admin lookup, its results, and this device's recent failures. */
export function DebugScreen({ initialRef = '', initialType = 'auto', admin, failuresAdmin = false }: DebugScreenProps) {
  const { currentRef, currentType, search, select } = useDebugRef(initialRef, initialType, admin);
  const { data, isLoading, isError, refetch } = useDiagnosticsLookup(currentRef, currentType, admin);

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {failuresAdmin ? (
        <Card>
          <ListRow asChild chevron title="Failures" subtitle="Failed emails and jobs across users">
            <Link href={`${settingsSection('debug').href}/failures`} prefetch={false} />
          </ListRow>
        </Card>
      ) : null}
      <LookupCard
        key={`${currentRef}|${currentType}`}
        admin={admin}
        initialRef={currentRef}
        initialType={currentType}
        isLoading={isLoading}
        onSearch={search}
      />

      {admin && isLoading ? (
        <Card title="Querying logs" subtitle="Correlating the request timeline">
          <div className="flex flex-col gap-space-8 desk:gap-space-12 px-space-16 pb-space-16">
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} width="60%" />
          </div>
        </Card>
      ) : null}

      {admin && isError ? (
        <LoadError what="that reference" retry={() => void refetch()} />
      ) : null}

      {admin && data && !isLoading ? (
        <div className="flex flex-col gap-space-8 desk:gap-space-16">
            {data.request ? (
              <RequestCard
                request={data.request}
                requestId={data.requestId}
                errorCode={data.rootCause.exceptionClass}
                errorMessage={data.rootCause.headline}
              />
            ) : null}
            <RootCauseCard rootCause={data.rootCause} />
          {data.timeline.length > 0 ? (
            <div>
              <TimelineCard
                timeline={data.timeline}
                truncated={data.truncated}
                currentRef={data.ref}
                currentType={currentType}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <LocalFailuresCard highlightRef={currentRef} onSelectRef={select} />
    </div>
  );
}
