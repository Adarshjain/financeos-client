'use client';

// "Widget settings": a built-in's params (the same form as the picker's) and an optional title in place of its own.
// Mounted only while open. Save hands the change to the dashboard (view mode saves it straight away, edit mode
// takes it into the draft); a failed save keeps the dialog open.

import { useMutation } from '@tanstack/react-query';
import React from 'react';

import { Dialog } from '@/components/ds/Dialog/Dialog';
import { TextField } from '@/components/ds/TextField/TextField';
import { showToast } from '@/components/ds/Toast/Toast';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { widgetParams } from '@/lib/dashboards.helpers';
import type { BuiltinWidgetResponse, WidgetParams, WidgetResponse } from '@/lib/dashboards.types';

import { ParamFields } from '../params/ParamFields';
import { useBuiltinParamsForm } from '../params/useBuiltinParamsForm';

const FORM_ID = 'widget-settings-form';

/** Stands in for the params form of a widget that has none. */
const NO_PARAMS: BuiltinWidgetResponse = { key: '', label: '', description: '', category: '', kind: 'template', minW: 0, params: [] };

export interface WidgetSettingsChange {
  /** A built-in's new params; absent for a widget without any (a report widget): only its title changes. */
  params?: WidgetParams;
  title: string | null;
}

export interface WidgetSettingsDialogProps {
  widget: WidgetResponse;
  /** The built-in's catalog entry; none for a report widget (its title is all there is to set). */
  def?: BuiltinWidgetResponse;
  /** Named in the description: "Changes this widget on Money overview only". */
  dashboardName?: string;
  onSave: (change: WidgetSettingsChange) => Promise<void> | void;
  onClose: () => void;
}

export function WidgetSettingsDialog({ widget, def, dashboardName, onSave, onClose }: WidgetSettingsDialogProps) {
  const form = useBuiltinParamsForm(def ?? NO_PARAMS, widgetParams(widget));
  const name = def?.label ?? widget.report?.name ?? '';
  const [title, setTitle] = React.useState(widget.title ?? '');
  const saveMutation = useMutation({
    mutationFn: (change: WidgetSettingsChange) => Promise.resolve(onSave(change)),
    onSuccess: onClose,
    onError: (e) => showToast(getErrorMessage(e, "Couldn't save the widget settings. Try again."), { tone: 'danger' }),
  });
  const saving = saveMutation.isPending;

  const save = () => saveMutation.mutate({ ...(def ? { params: form.params() } : {}), title: title.trim() || null });

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <Dialog.Content
        size="sm"
        title={`Widget settings · ${name}`}
        description={dashboardName ? `Changes this widget on ${dashboardName} only.` : undefined}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: saving }}
        primary={{ label: 'Save widget', type: 'submit', form: FORM_ID, disabled: !form.valid || saving, loading: saving }}
      >
        <Dialog.Body>
          <form
            id={FORM_ID}
            className="flex flex-col gap-space-8 desk:gap-space-12"
            onSubmit={(e) => {
              e.preventDefault();
              if (form.valid) save();
            }}
          >
            <ParamFields form={form} />
            <TextField label="Title" optional placeholder={name} value={title} onValueChange={setTitle} />
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
