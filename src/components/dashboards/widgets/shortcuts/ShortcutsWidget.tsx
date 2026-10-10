'use client';

// shortcuts: the user's tiles (icon + label) in their order. Pages, accounts,
// reports and dashboards are links; a dialog action (Add transaction, Record
// lending) loads its dialog on click — prefetched on hover / focus /
// touchstart — with a spinner in the tile meanwhile. Unknown ids are hidden.
// Four tiles a row on a phone; elsewhere as many as fit (two at quarter width).

import { Loader2, Zap } from 'lucide-react';
import Link from 'next/link';

import { useActionLauncher } from '@/components/shortcuts/actions';
import { type ShortcutItem, useShortcuts } from '@/components/shortcuts/catalog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { WidgetBody, WidgetEmpty } from '../investmentsLoansKit/kit';

const GRID = 'grid grid-cols-4 gap-2 md:[grid-template-columns:repeat(auto-fill,minmax(6.5rem,1fr))]';
const TILE =
  'flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-100 px-1.5 py-2.5 text-center text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/50 dark:focus-visible:bg-slate-800/50';

export function ShortcutsWidget({ ids, className }: { ids: readonly string[]; className?: string }) {
  const { items, pending } = useShortcuts(ids);
  const launcher = useActionLauncher();

  let body;
  if (items.length === 0 && pending) {
    body = (
      <div className={cn(GRID, 'px-4 pb-3')} data-testid="shortcuts-loading">
        {ids.slice(0, 4).map((id) => (
          <Skeleton key={id} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  } else if (items.length === 0) {
    body = <WidgetEmpty icon={Zap} title="No shortcuts" description="Pick some in this widget's settings." />;
  } else {
    body = (
      <ul className={cn(GRID, 'min-h-0 flex-1 overflow-y-auto px-4 pb-3')} aria-label="Shortcuts">
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <Tile
              item={item}
              loading={item.actionId != null && launcher.pendingId === item.actionId}
              onLaunch={() => item.actionId && void launcher.launch(item.actionId)}
              onPrefetch={() => item.actionId && launcher.prefetch(item.actionId)}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <WidgetBody className={className} testId="shortcuts-widget">
      {body}
      {launcher.dialog}
    </WidgetBody>
  );
}

function TileFace({ item, loading }: { item: ShortcutItem; loading?: boolean }) {
  return (
    <>
      <span className="flex h-5 w-5 items-center justify-center text-emerald-600 dark:text-emerald-400" aria-hidden>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : item.icon}
      </span>
      <span className="line-clamp-2 w-full break-words text-2xs font-medium leading-tight">{item.label}</span>
    </>
  );
}

function Tile({
  item,
  loading,
  onLaunch,
  onPrefetch,
}: {
  item: ShortcutItem;
  loading: boolean;
  onLaunch: () => void;
  onPrefetch: () => void;
}) {
  if (item.href) {
    return (
      <Link href={item.href} className={TILE} title={item.label}>
        <TileFace item={item} />
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={cn(TILE, 'w-full')}
      title={item.label}
      onClick={onLaunch}
      onPointerEnter={onPrefetch}
      onFocus={onPrefetch}
      onTouchStart={onPrefetch}
      disabled={loading}
      aria-busy={loading || undefined}
    >
      <TileFace item={item} loading={loading} />
    </button>
  );
}
