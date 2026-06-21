'use client';

// Edit-mode picker: choose a saved report to add as a widget. Only existing
// reports are offered (widgets reference reports by id).

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ReportSummaryResponse } from '@/lib/reports.types';

interface AddWidgetDialogProps {
  reports: ReportSummaryResponse[];
  onAdd: (report: ReportSummaryResponse) => void;
}

export function AddWidgetDialog({ reports, onAdd }: AddWidgetDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4" />
          Add widget
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a report widget</DialogTitle>
        </DialogHeader>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-500">
            No saved reports yet.{' '}
            <Link href="/reports/new" className="text-emerald-600 underline">
              Create one
            </Link>{' '}
            first.
          </p>
        ) : (
          <div className="max-h-80 space-y-1 overflow-auto">
            {reports.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onAdd(r);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {r.name}
                </span>
                <Badge variant="secondary">{r.type}</Badge>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
