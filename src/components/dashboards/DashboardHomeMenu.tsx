'use client';

// Home's dashboard menu, next to the switcher: act on the shown dashboard
// without leaving Home. "Add widget" opens the picker and saves the pick
// straight away (it lands below the rest); "Edit dashboard" turns Home's grid
// into the editor in place; "Set as default" (only when it isn't) makes it the
// dashboard Home opens on; "New dashboard" goes to the create page.

import { LayoutDashboard, Loader2, MoreHorizontal, Pencil, Plus, Star } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { builtinWidgetResponse, reportWidgetResponse } from '@/features/dashboards/editor/dashboardEditorModel';
import { legacyHref } from '@/features/shell/routes';
import type { BuiltinWidgetResponse, DashboardResponse, WidgetParams } from '@/lib/dashboards.types';
import { useAddDashboardWidget, useSetDefaultDashboard } from '@/lib/query/hooks/useDashboards';
import { useReportsList } from '@/lib/query/hooks/useReports';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { AddWidgetDialog } from './AddWidgetDialog';

interface DashboardHomeMenuProps {
  dashboard: DashboardResponse;
  onEdit: () => void;
}

const itemIconClass = 'h-3.5 w-3.5 text-slate-400';

export function DashboardHomeMenu({ dashboard, onEdit }: DashboardHomeMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  // Opening the menu starts loading the reports, so the picker has them when it opens.
  const { data: reports = [] } = useReportsList({ enabled: menuOpen || addOpen });
  const addWidget = useAddDashboardWidget();
  const setDefault = useSetDefaultDashboard();
  const busy = addWidget.isPending || setDefault.isPending;

  const addReport = (report: ReportSummaryResponse) =>
    addWidget.mutate({ dashboard, widget: reportWidgetResponse(dashboard.widgets, report) });

  const addBuiltin = (def: BuiltinWidgetResponse, params: WidgetParams) =>
    addWidget.mutate({ dashboard, widget: builtinWidgetResponse(dashboard.widgets, def, params) });

  return (
    <>
      {/* Non-modal: "Add widget" opens a dialog, which a modal menu would leave the page inert behind. */}
      <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            title="Dashboard actions"
            aria-label="Dashboard actions"
            disabled={busy}
          >
            {busy ? <Loader2 className="animate-spin text-slate-500" /> : <MoreHorizontal className="text-slate-500" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[11rem]">
          <DropdownMenuItem className="text-xs" onSelect={() => setAddOpen(true)}>
            <Plus className={itemIconClass} />
            Add widget
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs" onSelect={onEdit}>
            <Pencil className={itemIconClass} />
            Edit dashboard
          </DropdownMenuItem>
          {!dashboard.isDefault && (
            <DropdownMenuItem
              className="text-xs"
              onSelect={() =>
                setDefault.mutate({ id: dashboard.id, makeDefault: true, updatedAt: dashboard.updatedAt })
              }
            >
              <Star className={itemIconClass} />
              Set as default
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="text-xs">
            <Link href={legacyHref('/dashboards/new')}>
              <LayoutDashboard className={itemIconClass} />
              New dashboard
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AddWidgetDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        reports={reports}
        onAdd={addReport}
        onAddBuiltin={addBuiltin}
      />
    </>
  );
}
