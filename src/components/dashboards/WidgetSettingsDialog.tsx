'use client';

// "Widget settings" for a built-in on a dashboard in view mode: the same
// params form as the picker's details step, prefilled with the widget's
// params. Save hands the new params to the dashboard, which persists them
// (the widget then refetches with them); a failed save keeps the dialog open.
// While a save is in flight Save is disabled with a spinner, and a second
// press is ignored (one PUT per save).

import { useRef, useState } from 'react';

import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { widgetParams } from '@/lib/dashboards.helpers';
import type { BuiltinWidgetResponse, WidgetParams, WidgetResponse } from '@/lib/dashboards.types';
import { toastError } from '@/lib/toastError';

import { BuiltinParamsFields } from './params/BuiltinParamsFields';
import { useParamsForm } from './params/useParamsForm';

interface WidgetSettingsDialogProps {
  widget: WidgetResponse;
  def: BuiltinWidgetResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (params: WidgetParams) => Promise<void>;
}

function SettingsForm({ widget, def, onOpenChange, onSave }: Omit<WidgetSettingsDialogProps, 'open'>) {
  const form = useParamsForm(def, widgetParams(widget));
  const [saving, setSaving] = useState(false);
  // State updates are async: the ref stops a second press before the re-render disables the button.
  const inFlight = useRef(false);
  const save = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await onSave(form.params());
      onOpenChange(false);
    } catch (e) {
      toastError(e, 'Failed to save widget settings');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  return (
    <>
      <DialogBody>
        <BuiltinParamsFields form={form} />
      </DialogBody>
      <DialogFooter
        secondaryAction={{ label: 'Cancel', onClick: () => onOpenChange(false), disabled: saving }}
        primaryAction={{ label: 'Save', onClick: save, disabled: !form.valid, pending: saving }}
      />
    </>
  );
}

export function WidgetSettingsDialog({ open, ...props }: WidgetSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Widget settings</DialogTitle>
        </DialogHeader>
        {open && <SettingsForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}
