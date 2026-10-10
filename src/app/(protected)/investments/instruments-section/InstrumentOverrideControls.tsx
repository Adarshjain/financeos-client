'use client';

import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Instrument } from '@/lib/types';

import { describeOverriddenFields, isOverridden } from '../instrument-form/instrumentEdit';
import { useResetInstrumentOverrides } from '../instrument-form/useInstrumentEdit';

/** "Edited for your account" when the signed-in user has their own edits on the instrument. */
export function InstrumentOverrideBadge({ instrument }: { instrument: Instrument }) {
  if (!isOverridden(instrument)) return null;
  const fields = describeOverriddenFields(instrument.overriddenFields);
  const detail = fields ? `Edited for your account: ${fields}` : 'Edited for your account';
  return (
    <Badge
      variant="secondary"
      className="text-2xs font-medium text-slate-600 dark:text-slate-400 px-1.5 py-0 border border-slate-200 dark:border-slate-800"
      title={detail}
    >
      Edited for your account
      {fields && <span className="sr-only">: {fields}</span>}
    </Badge>
  );
}

/** Row action that drops the user's edits (confirmed first); renders nothing when there are none. */
export function ResetInstrumentButton({ instrument }: { instrument: Instrument }) {
  const reset = useResetInstrumentOverrides();
  if (!isOverridden(instrument)) return null;
  const fields = describeOverriddenFields(instrument.overriddenFields);
  return (
    <ConfirmationDialog
      title="Reset to catalog?"
      description={`Your edits to ${instrument.name}${fields ? ` (${fields})` : ''} are removed and it shows the catalog details again. Only your account is affected.`}
      primaryActionText="Reset to catalog"
      variant="default"
      loading={reset.isPending}
      primaryAction={async () => {
        const restored = await reset.mutateAsync(instrument.id);
        toast.success(`${restored.name} reset to catalog`);
      }}
      trigger={
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          title="Reset to catalog"
          aria-label="Reset to catalog"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      }
    />
  );
}
