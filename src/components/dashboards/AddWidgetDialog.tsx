'use client';

// Edit-mode picker: add a built-in widget (from the server's catalog) or a
// saved report as a widget. A search box and categories (chips on a phone, a
// left rail on desktop) narrow the list; built-in cards show the registry
// icon, the label and the full description — the only place a built-in's
// description appears. Picking a built-in opens its details step (preview on
// sample data + settings) before it is added; built-ins may be added more than
// once. One the user cannot use yet is dimmed with the server's reason.

import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';
import { useBuiltins } from '@/lib/query/hooks/useBuiltins';
import { keys } from '@/lib/query/keys';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { BuiltinCards } from './picker/BuiltinCards';
import { BuiltinDetailsStep } from './picker/BuiltinDetailsStep';
import { CategoryNav } from './picker/CategoryNav';
import {
  filterBuiltins,
  filterReports,
  type PickerCategory,
  visibleCategories,
} from './picker/pickerCategories';
import { ReportRows, sectionTitle } from './picker/ReportRows';

interface AddWidgetDialogProps {
  reports: ReportSummaryResponse[];
  onAdd: (report: ReportSummaryResponse) => void;
  onAddBuiltin: (def: BuiltinWidgetResponse, params: WidgetParams) => void;
  /** The dashboard being edited has unsaved changes (leaving for the report builder confirms first). */
  hasUnsavedChanges?: boolean;
}

export function AddWidgetDialog({ reports, onAdd, onAddBuiltin, hasUnsavedChanges = false }: AddWidgetDialogProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<BuiltinWidgetResponse | null>(null);
  const [category, setCategory] = useState<PickerCategory>('all');
  const [query, setQuery] = useState('');
  const { data: builtins = [], isLoading: builtinsLoading } = useBuiltins(open);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Availability is per user and changes with their data (a first card, a first loan): re-check on open.
    if (next) {
      qc.invalidateQueries({ queryKey: keys.dashboards.builtins() });
      return;
    }
    setPending(null);
    setCategory('all');
    setQuery('');
  };

  const categories = useMemo(() => visibleCategories(builtins), [builtins]);
  const shownBuiltins = filterBuiltins(builtins, category, query);
  const shownReports = filterReports(reports, category, query);
  const showBuiltins = category !== 'reports';
  const showReports = category === 'all' || category === 'reports';

  const confirmBuiltin = (params: WidgetParams) => {
    if (!pending) return;
    onAddBuiltin(pending, params);
    handleOpenChange(false);
  };

  const pickReport = (report: ReportSummaryResponse) => {
    onAdd(report);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Add widget</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{pending ? pending.label : 'Add a widget'}</DialogTitle>
        </DialogHeader>
        {pending ? (
          <BuiltinDetailsStep
            key={pending.key}
            def={pending}
            onBack={() => setPending(null)}
            onConfirm={confirmBuiltin}
          />
        ) : (
          <DialogBody className="space-y-3">
            <Input
              type="search"
              aria-label="Search widgets"
              placeholder="Search widgets"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
              <CategoryNav categories={categories} value={category} onChange={setCategory} />
              <div className="min-w-0 flex-1 space-y-4">
                {showBuiltins && (
                  <section className="space-y-1.5">
                    {category === 'all' && <h3 className={sectionTitle}>Built-in</h3>}
                    {builtinsLoading ? (
                      <div className="flex justify-center py-3 text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : builtins.length === 0 ? (
                      <p className="text-sm text-slate-500">No built-in widgets available.</p>
                    ) : shownBuiltins.length === 0 ? (
                      <p className="text-sm text-slate-500">No widgets match.</p>
                    ) : (
                      <BuiltinCards builtins={shownBuiltins} onPick={setPending} />
                    )}
                  </section>
                )}
                {showReports && (
                  <ReportRows
                    reports={shownReports}
                    hasAny={reports.length > 0}
                    heading={category === 'all' ? 'Your reports' : undefined}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onPick={pickReport}
                  />
                )}
              </div>
            </div>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  );
}
