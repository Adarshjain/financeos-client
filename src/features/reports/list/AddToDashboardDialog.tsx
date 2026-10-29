'use client';

import React from 'react';

import { Dialog, DialogBody, DialogContent, Select } from '@/components/ds';
import { ErrorState } from '@/components/organisms';
import { useDashboards } from '@/lib/query/hooks/useDashboards';

import type { ReportRow } from './reportsList';

export interface AddToDashboardDialogProps {
  report: ReportRow;
  adding: boolean;
  onAdd: (dashboardId: string) => void;
  onClose: () => void;
}

/** Picks one of the user's dashboards to put the report on, as a new widget below the others. */
export function AddToDashboardDialog({ report, adding, onAdd, onClose }: AddToDashboardDialogProps) {
  const dashboards = useDashboards();
  const [chosen, setChosen] = React.useState('');
  const already = new Set(report.dashboards.map((d) => d.id));
  return (
    <Dialog open onOpenChange={(open) => (open || adding ? undefined : onClose())}>
      <DialogContent
        size="sm"
        title="Add to dashboard"
        description={`${report.name} becomes a widget at the bottom of the dashboard.`}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: adding }}
        primary={{
          label: 'Add to dashboard',
          loading: adding,
          disabled: adding || !chosen || dashboards.isError,
          onSelect: () => onAdd(chosen),
        }}
      >
        <DialogBody>
          {dashboards.isError ? (
            <ErrorState
              title="Couldn't load dashboards"
              action={{ label: 'Retry', onSelect: () => void dashboards.refetch() }}
            />
          ) : (
            <Select
              label="Dashboard"
              placeholder="Choose a dashboard"
              loading={dashboards.isLoading}
              options={(dashboards.data ?? []).map((d) => ({
                value: d.id,
                label: d.name,
                disabled: already.has(d.id),
                disabledReason: 'Already on this dashboard',
              }))}
              value={chosen}
              onValueChange={(v) => setChosen(v as string)}
            />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
