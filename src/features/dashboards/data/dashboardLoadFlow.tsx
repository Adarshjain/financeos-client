'use client';

// dashboard.load flow: from the navigation start to every widget in view having its data (or its failure).
// Frames report once they are in view; the flow ends when all reported widgets settled and no more joined for a beat.

import React from 'react';

import { startFlow } from '@/lib/observability/flow';
import { navigationStartForScreen } from '@/lib/observability/navigationClock';

const NOT_SETTLED = 'pending' as const;
const SETTLE_MS = 150;

const Ctx = React.createContext<{ report: (id: string, state: 'pending' | 'settled' | 'error') => void } | null>(null);

export function DashboardLoadFlowProvider({ widgetCount, children }: { widgetCount: number; children: React.ReactNode }) {
  // The flow starts with the first render; end() is a no-op after the first call, so no 'ended' flag is needed.
  const [flow] = React.useState(() => startFlow('dashboard.load', navigationStartForScreen()));
  const states = React.useRef(new Map<string, 'pending' | 'settled' | 'error'>());
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (widgetCount === 0) flow.end('empty');
  }, [widgetCount, flow]);
  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api = React.useMemo(
    () => ({
      report(id: string, state: 'pending' | 'settled' | 'error') {
        states.current.set(id, state);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const all = [...states.current.values()];
          if (all.length === 0 || all.includes(NOT_SETTLED)) return;
          flow.end(all.includes('error') ? 'error' : 'ok');
        }, SETTLE_MS);
      },
    }),
    [flow],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/** Called by a widget frame: reports its load state once it is in view. No-op outside a dashboard view. */
export function useReportWidgetLoad(widgetId: string, state: 'pending' | 'settled' | 'error' | null): void {
  const ctx = React.useContext(Ctx);
  React.useEffect(() => {
    if (ctx && state) ctx.report(widgetId, state);
  }, [ctx, widgetId, state]);
}
