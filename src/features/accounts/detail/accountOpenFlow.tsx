'use client';

// account.open flow: starts on a tap of an account row in the accounts list, ends when the account detail's shell
// (title and tabs, built from the loaded account) has rendered.

import React from 'react';

import { startFlow } from '@/lib/observability/flow';

const MAX_AGE_MS = 10_000;
let open: { flow: ReturnType<typeof startFlow>; accountId: string; at: number } | null = null;

export function beginAccountOpen(accountId: string): void {
  open = { flow: startFlow('account.open'), accountId, at: performance.now() };
}

/** Renders nothing; ends the flow once, when the detail first shows. */
export function AccountOpenFlowEnd({ accountId }: { accountId: string }) {
  React.useEffect(() => {
    const started = open;
    open = null;
    // A tap that led nowhere (ctrl-click, say) must not time a later visit.
    if (started && started.accountId === accountId && performance.now() - started.at <= MAX_AGE_MS) started.flow.end('ok');
  }, [accountId]);
  return null;
}
