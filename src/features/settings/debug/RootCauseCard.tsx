import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { ListField } from '@/components/ds/ListField/ListField';
import { Text } from '@/components/ds/Text/Text';
import type { DiagnosticsLookupResponse } from '@/lib/api/types';

/** What failed first: where, why, the Oracle code and the knowledge-base hints. */
export function RootCauseCard({ rootCause }: { rootCause: DiagnosticsLookupResponse['rootCause'] }) {
  const where = rootCause.rootFrame ?? rootCause.exceptionClass;
  return (
    <Card title="Root cause" subtitle="What failed first">
      {where ? (
        <ListField
          label="Where"
          value={
            <Text mono variant="body-strong">
              {where}
            </Text>
          }
        />
      ) : null}
      <ListField label="Why" value={rootCause.detail ? `${rootCause.headline}. ${rootCause.detail}` : rootCause.headline} />
      {rootCause.oraCode ? (
        <ListField
          label="Oracle code"
          value={
            <Text mono variant="body-strong" tone="danger">
              {rootCause.oraCode}
            </Text>
          }
        />
      ) : null}
      {(rootCause.hints ?? []).map((hint, i) => (
        <ListField key={i} label="Hint" value={hint} />
      ))}
    </Card>
  );
}
