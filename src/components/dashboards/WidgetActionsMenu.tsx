'use client';

// The widget header's single overflow menu (view mode): "Edit report" for a
// saved-report widget, "Widget settings" for a built-in with editable params
// (when the dashboard can save them), "Duplicate as my report" for a built-in
// template (with this widget's params), "View full page" for any available
// widget, then "View underlying data" for a KPI widget whose value has loaded.
// Always visible, so it works on touch where hover affordances do not.
//
// Whether a built-in has editable params comes from the server's catalog,
// fetched with the dashboard when it can save params (one shared, cached
// query for all its built-ins), so "Widget settings" is there on the first
// menu open.

import { Copy, Loader2, Maximize2, MoreHorizontal, Pencil, Settings2, TableProperties } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isBuiltinWidget, widgetParams } from '@/lib/dashboards.helpers';
import type { WidgetParams, WidgetResponse } from '@/lib/dashboards.types';
import { useBuiltins } from '@/lib/query/hooks/useBuiltins';

import { hasEditableParams } from './params/paramsModel';
import { useDuplicateBuiltin } from './useDuplicateBuiltin';
import { WidgetSettingsDialog } from './WidgetSettingsDialog';

interface WidgetActionsMenuProps {
  widget: WidgetResponse;
  onExpand: () => void;
  /** KPI widgets only: "View underlying data" (omitted = no item). */
  onViewUnderlying?: () => void;
  /** Saves a built-in's new params (omitted = no "Widget settings"). */
  onParamsChange?: (params: WidgetParams) => Promise<void>;
}

interface MenuProps extends Omit<WidgetActionsMenuProps, 'onParamsChange'> {
  /** Template built-ins only: "Duplicate as my report". */
  duplicate?: { pending: boolean; run: () => void };
  /** Built-ins with editable params: "Widget settings". */
  onSettings?: () => void;
}

const itemIconClass = 'h-3.5 w-3.5 text-slate-400';

/** The overflow menu for any widget; built-ins add settings, templates "Duplicate as my report". */
export function WidgetActionsMenu({ widget, onParamsChange, ...actions }: WidgetActionsMenuProps) {
  const builtin = isBuiltinWidget(widget) ? widget.builtin : null;
  const builtinKey = widget.builtinKey ?? builtin?.key ?? null;
  if (!builtin || !builtinKey) return <Menu widget={widget} {...actions} />;
  return (
    <BuiltinActionsMenu
      widget={widget}
      builtinKey={builtinKey}
      isTemplate={builtin.kind === 'template'}
      onParamsChange={onParamsChange}
      {...actions}
    />
  );
}

interface BuiltinActionsMenuProps extends WidgetActionsMenuProps {
  builtinKey: string;
  isTemplate: boolean;
}

function BuiltinActionsMenu({ builtinKey, isTemplate, onParamsChange, ...props }: BuiltinActionsMenuProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: catalog } = useBuiltins(Boolean(onParamsChange));
  const def = catalog?.find((d) => d.key === builtinKey) ?? null;
  const editable = def != null && onParamsChange != null && hasEditableParams(def);

  const menuProps: MenuProps = {
    ...props,
    onSettings: editable ? () => setSettingsOpen(true) : undefined,
  };

  return (
    <>
      {isTemplate ? <TemplateActionsMenu builtinKey={builtinKey} {...menuProps} /> : <Menu {...menuProps} />}
      {editable && onParamsChange && (
        <WidgetSettingsDialog
          widget={props.widget}
          def={def}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSave={onParamsChange}
        />
      )}
    </>
  );
}

// Only template widgets mount the duplicate mutation (and the router it navigates with).
function TemplateActionsMenu({ builtinKey, ...props }: MenuProps & { builtinKey: string }) {
  const duplicate = useDuplicateBuiltin();
  return (
    <Menu
      {...props}
      duplicate={{
        pending: duplicate.isPending,
        run: () => duplicate.mutate({ builtinKey, params: widgetParams(props.widget) }),
      }}
    />
  );
}

function Menu({ widget, onExpand, onViewUnderlying, duplicate, onSettings }: MenuProps) {
  const reportId = !isBuiltinWidget(widget) ? (widget.reportId ?? null) : null;

  return (
    // Non-modal: "View full page" opens a dialog, which a modal menu would leave the page inert behind.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          title="More actions"
          aria-label="More actions"
          disabled={duplicate?.pending}
        >
          {duplicate?.pending ? (
            <Loader2 className="animate-spin text-slate-500" />
          ) : (
            <MoreHorizontal className="text-slate-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        {reportId && (
          <DropdownMenuItem asChild className="text-xs">
            <Link href={`/reports/${reportId}`}>
              <Pencil className={itemIconClass} />
              Edit report
            </Link>
          </DropdownMenuItem>
        )}
        {onSettings && (
          <DropdownMenuItem className="text-xs" onSelect={onSettings}>
            <Settings2 className={itemIconClass} />
            Widget settings
          </DropdownMenuItem>
        )}
        {duplicate && (
          <DropdownMenuItem className="text-xs" onSelect={duplicate.run}>
            <Copy className={itemIconClass} />
            Duplicate as my report
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="text-xs" onSelect={onExpand}>
          <Maximize2 className={itemIconClass} />
          View full page
        </DropdownMenuItem>
        {onViewUnderlying && (
          <DropdownMenuItem className="text-xs" onSelect={onViewUnderlying}>
            <TableProperties className={itemIconClass} />
            View underlying data
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
