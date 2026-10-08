'use client';

// Edit-mode picker: add a built-in widget (from the server's catalog) or a
// saved report as a widget. Built-ins may be added more than once; one that
// takes params opens a small params step before it is added.

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';
import { useBuiltins } from '@/lib/query/hooks/useBuiltins';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { BuiltinParamsStep, needsParamsStep } from './BuiltinParamsStep';

interface AddWidgetDialogProps {
  reports: ReportSummaryResponse[];
  onAdd: (report: ReportSummaryResponse) => void;
  onAddBuiltin: (def: BuiltinWidgetResponse, params: WidgetParams) => void;
}

const sectionTitle = 'text-2xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500';
const rowClass =
  'flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800';

export function AddWidgetDialog({ reports, onAdd, onAddBuiltin }: AddWidgetDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<BuiltinWidgetResponse | null>(null);
  const { data: builtins = [], isLoading: builtinsLoading } = useBuiltins(open);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setPending(null);
  };

  const pickBuiltin = (def: BuiltinWidgetResponse) => {
    if (needsParamsStep(def)) {
      setPending(def);
      return;
    }
    onAddBuiltin(def, {});
    handleOpenChange(false);
  };

  const confirmBuiltin = (params: WidgetParams) => {
    if (!pending) return;
    onAddBuiltin(pending, params);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          Add widget
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pending ? pending.label : 'Add a widget'}</DialogTitle>
        </DialogHeader>
        {pending ? (
          <BuiltinParamsStep
            key={pending.key}
            def={pending}
            onBack={() => setPending(null)}
            onConfirm={confirmBuiltin}
          />
        ) : (
          <DialogBody className="space-y-4">
            <section className="space-y-1.5">
              <h3 className={sectionTitle}>Built-in</h3>
              {builtinsLoading ? (
                <div className="flex justify-center py-3 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : builtins.length === 0 ? (
                <p className="text-sm text-slate-500">No built-in widgets available.</p>
              ) : (
                <div className="space-y-1">
                  {builtins.map((b) => (
                    <button key={b.key} type="button" onClick={() => pickBuiltin(b)} className={rowClass}>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                          {b.label}
                        </span>
                        <span className="block text-xs text-slate-500">{b.description}</span>
                      </span>
                      <Badge variant="secondary">Built-in</Badge>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-1.5">
              <h3 className={sectionTitle}>Your reports</h3>
              {reports.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No saved reports yet.{' '}
                  <Link href="/reports/new" className="text-emerald-600 underline">
                    Create one
                  </Link>{' '}
                  first.
                </p>
              ) : (
                <div className="space-y-1">
                  {reports.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        onAdd(r);
                        handleOpenChange(false);
                      }}
                      className={rowClass}
                    >
                      <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {r.name}
                      </span>
                      <Badge variant="secondary">{r.type}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  );
}
