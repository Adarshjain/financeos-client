'use client';

// The picker's details step for one built-in: what it shows (label is the
// dialog title; the full description and the `requires` line here), a static
// preview of it on sample data, its settings, then Add widget / Back.

import { DialogBody, DialogFooter } from '@/components/ui/dialog';
import type { BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';

import { BuiltinParamsFields } from '../params/BuiltinParamsFields';
import { useParamsForm } from '../params/useParamsForm';
import { WidgetPreview } from '../previews/WidgetPreview';

interface BuiltinDetailsStepProps {
  def: BuiltinWidgetResponse;
  onBack: () => void;
  onConfirm: (params: WidgetParams) => void;
}

export function BuiltinDetailsStep({ def, onBack, onConfirm }: BuiltinDetailsStepProps) {
  const form = useParamsForm(def);
  return (
    <>
      <DialogBody className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-slate-600 dark:text-slate-300">{def.description}</p>
          {def.requires && <p className="text-xs text-slate-500 dark:text-slate-400">{def.requires}</p>}
        </div>
        <WidgetPreview builtinKey={def.key} />
        <BuiltinParamsFields form={form} />
      </DialogBody>
      <DialogFooter
        secondaryAction={{ label: 'Back', onClick: onBack }}
        primaryAction={{ label: 'Add widget', onClick: () => onConfirm(form.params()), disabled: !form.valid }}
      />
    </>
  );
}
