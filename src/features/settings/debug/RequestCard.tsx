import React from 'react';

import { Badge, Card, ListField, Text } from '@/components/ds';
import type { DiagnosticsLookupResponse } from '@/lib/api/types';

import { formatWhenFull, requestUser, statusTone } from './debugModel';

interface RequestCardProps {
  request: NonNullable<DiagnosticsLookupResponse['request']>;
  requestId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

/** What the server saw for the request: status, when, route, who, version. */
export function RequestCard({ request, requestId, errorCode, errorMessage }: RequestCardProps) {
  return (
    <Card
      title="Request"
      subtitle={
        requestId ? (
          <Text mono variant="label" tone="ink-3">
            {requestId}
          </Text>
        ) : undefined
      }
      action={
        <div className="flex items-center gap-space-6">
          {request.slow ? <Badge tone="warning">Slow</Badge> : null}
          <Badge tone={statusTone(request.status)}>{request.status}</Badge>
        </div>
      }
    >
      <ListField label="When" value={formatWhenFull(request.at)} />
      <ListField
        label="Route"
        value={
          <Text mono variant="body-strong">
            {request.method} {request.route}
          </Text>
        }
      />
      <ListField label="Duration" value={`${request.durationMs} ms`} />
      <ListField label="User" value={requestUser(request)} />
      {errorCode || errorMessage ? (
        <ListField
          label="Error"
          value={
            <>
              {errorCode ? (
                <Text mono variant="body-strong">
                  {errorCode}
                </Text>
              ) : null}
              {errorCode && errorMessage ? ' · ' : null}
              {errorMessage}
            </>
          }
        />
      ) : null}
      <ListField
        label="Server version"
        value={
          <Text mono variant="body-strong">
            {request.version ?? 'unknown'}
          </Text>
        }
      />
    </Card>
  );
}
