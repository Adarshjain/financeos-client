'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { Dialog, DialogBody, DialogContent, Skeleton } from '@/components/ds';
import { watchSession } from '@/lib/authExpiry';
import { keys } from '@/lib/query/keys';

import { type EpfFormOptions, loadEpfFormOptions } from './epfActions';
import { EpfEntryDialog } from './EpfEntryDialog';
import type { EpfEntryType } from './epfModel';

export interface EpfAddDialogProps {
  onClose: () => void;
  /** The type the form opens on (a contribution by default). */
  initialType?: EpfEntryType;
}

/** Adds an EPF entry: the top bar's + and the empty tab's "Add opening balance" open it. */
export function EpfAddDialog({ onClose, initialType }: EpfAddDialogProps) {
  const query = useQuery({
    queryKey: [...keys.investments.all, 'epf-form-options'],
    gcTime: 0,
    queryFn: async (): Promise<EpfFormOptions> => {
      const result = await watchSession(loadEpfFormOptions());
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
  if (query.isPending || query.isError) {
    return (
      <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
        <DialogContent
          size="sm"
          title="Record EPF entry"
          description={query.isError ? "Couldn't load the employers. Close this and try again." : undefined}
          secondary={{ label: query.isError ? 'Close' : 'Cancel', onSelect: onClose }}
        >
          <DialogBody>
            {query.isError ? null : (
              <div className="flex flex-col gap-space-8 desk:gap-space-12">
                <Skeleton height={32} />
                <Skeleton height={32} />
                <Skeleton height={32} />
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <EpfEntryDialog
      employers={query.data.employers}
      latestContribution={query.data.latestContribution}
      initialType={initialType}
      onClose={onClose}
    />
  );
}
