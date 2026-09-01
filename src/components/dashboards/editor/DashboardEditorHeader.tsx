'use client';

import { ArrowLeft, Loader2, Pencil } from 'lucide-react';
import React from 'react';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { AddWidgetDialog } from '../AddWidgetDialog';

interface DashboardEditorHeaderProps {
  mode: 'create' | 'edit';
  editing: boolean;
  isDirty: boolean;
  name: string;
  setName: (name: string) => void;
  description: string;
  saving: boolean;
  reports: ReportSummaryResponse[];
  onDiscardAndExit: () => void;
  onStartEdit: () => void;
  onAddWidget: (report: ReportSummaryResponse) => void;
  onSave: () => void;
}

export function DashboardEditorHeader({
  mode,
  editing,
  isDirty,
  name,
  setName,
  description,
  saving,
  reports,
  onDiscardAndExit,
  onStartEdit,
  onAddWidget,
  onSave,
}: DashboardEditorHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4">
      {editing && isDirty ? (
        <ConfirmationDialog
          title="Discard changes?"
          description="Your unsaved changes to this dashboard will be lost."
          primaryActionText="Discard"
          primaryAction={onDiscardAndExit}
          trigger={
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          }
        />
      ) : (
        <Button variant="ghost" size="icon" onClick={onDiscardAndExit}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}

      {editing ? (
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            className="max-w-xs"
            placeholder="Dashboard name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
        </div>
      ) : (
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {name}
          </h1>
          {description && (
            <p className="text-sm text-slate-500">{description}</p>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {editing ? (
          <>
            <AddWidgetDialog reports={reports} onAdd={onAddWidget} />
            <Button onClick={onSave} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === 'edit' ? 'Save' : 'Create'}
            </Button>
          </>
        ) : (
          <Button onClick={onStartEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}
