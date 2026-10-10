// The picker's built-in cards: the client registry's icon, the label and the
// full description. A built-in the user cannot use yet (the server's
// `unavailableReason`) is dimmed, says why, and cannot be picked.

import { createElement } from 'react';

import type { BuiltinWidgetResponse } from '@/lib/dashboards.types';

import { builtinIcon } from '../builtins/registry';

const cardClass =
  'flex w-full items-start gap-3 rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent dark:border-slate-800 dark:hover:bg-slate-800';
const chipClass =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';

function BuiltinCard({ def, onPick }: { def: BuiltinWidgetResponse; onPick: (def: BuiltinWidgetResponse) => void }) {
  const reason = def.unavailableReason ?? null;
  return (
    <button
      type="button"
      className={cardClass}
      disabled={reason != null}
      onClick={() => onPick(def)}
      data-testid={`builtin-card-${def.key}`}
    >
      <span className={chipClass} aria-hidden="true">
        {createElement(builtinIcon(def.key), { className: 'h-4 w-4' })}
      </span>
      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-medium text-slate-900 dark:text-white">{def.label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{def.description}</span>
        {reason && <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">{reason}</span>}
      </span>
    </button>
  );
}

interface BuiltinCardsProps {
  builtins: BuiltinWidgetResponse[];
  onPick: (def: BuiltinWidgetResponse) => void;
}

export function BuiltinCards({ builtins, onPick }: BuiltinCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {builtins.map((b) => (
        <BuiltinCard key={b.key} def={b} onPick={onPick} />
      ))}
    </div>
  );
}
