'use client';

// The widget header's single overflow menu (view mode): "Edit report" for a
// saved-report widget, "Duplicate as my report" for a built-in template (with
// this widget's params), and "View full page" for any available widget. Always
// visible, so it works on touch where hover affordances do not.

import { Copy, Loader2, Maximize2, MoreHorizontal, Pencil } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isBuiltinWidget, widgetParams } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';

import { useDuplicateBuiltin } from './useDuplicateBuiltin';

interface WidgetActionsMenuProps {
  widget: WidgetResponse;
  onExpand: () => void;
}

interface MenuProps extends WidgetActionsMenuProps {
  /** Template built-ins only: "Duplicate as my report". */
  duplicate?: { pending: boolean; run: () => void };
}

const itemIconClass = 'h-3.5 w-3.5 text-slate-400';

/** The overflow menu for any widget; template built-ins also get "Duplicate as my report". */
export function WidgetActionsMenu({ widget, onExpand }: WidgetActionsMenuProps) {
  const builtin = isBuiltinWidget(widget) ? widget.builtin : null;
  const builtinKey = widget.builtinKey ?? builtin?.key ?? null;
  if (builtin?.kind === 'template' && builtinKey) {
    return <TemplateActionsMenu widget={widget} builtinKey={builtinKey} onExpand={onExpand} />;
  }
  return <Menu widget={widget} onExpand={onExpand} />;
}

// Only template widgets mount the duplicate mutation (and the router it navigates with).
function TemplateActionsMenu({ builtinKey, ...props }: WidgetActionsMenuProps & { builtinKey: string }) {
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

function Menu({ widget, onExpand, duplicate }: MenuProps) {
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
