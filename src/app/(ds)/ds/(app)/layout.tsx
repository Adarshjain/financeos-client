import React, { Suspense } from 'react';

import { SessionExpiredDialog } from '@/features/auth/SessionExpiredDialog';
import { AddLendingProvider } from '@/features/lendings/form/AddLendingProvider';
import { AddTradeProvider } from '@/features/shell/AddTradeProvider';
import { HideAmountsProvider } from '@/features/shell/hideAmounts';
import { readHideAmounts } from '@/features/shell/hideAmountsCookie';
import { NavigationProgress } from '@/features/shell/NavigationProgress';
import { NewVersionWatcher } from '@/features/shell/NewVersionWatcher';
import { ShellRail, ShellTabBar } from '@/features/shell/ShellNav';
import { AddTransactionProvider } from '@/features/transactions/form/AddTransactionProvider';
import { requireAuth } from '@/lib/auth';
import { buildVersion } from '@/lib/buildVersion';
import { todayInAppZone } from '@/lib/date-range';
import { PageTransition } from '@/lib/viewTransition';

export default async function DsAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const hideAmounts = await readHideAmounts();

  return (
    <HideAmountsProvider initialHidden={hideAmounts}>
    <AddLendingProvider>
    <AddTradeProvider>
      <AddTransactionProvider today={todayInAppZone()}>
      <SessionExpiredDialog email={user.email} />
      <NewVersionWatcher loadedVersion={buildVersion()} />
      {/* While the new-version banner shows above, it owns the notch inset (safe-top). */}
      <div className="flex min-h-dvh [[data-new-version-banner]+&]:[--ds-safe-top:0px]">
        {/* Desktop Rail (hidden below desk) */}
        <div className="hidden desk:flex shrink-0 h-dvh sticky top-0">
          <ShellRail
            user={{
              name: user.displayName ?? undefined,
              email: user.email,
            }}
          />
        </div>

        {/* Main content column */}
        <div className="flex-1 min-w-0 flex flex-col min-h-dvh">
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <PageTransition>{children}</PageTransition>
        </div>

        {/* Phone floating TabBar (hidden from desk) */}
        <ShellTabBar
          user={{
            name: user.displayName ?? undefined,
            email: user.email,
          }}
        />
      </div>
      </AddTransactionProvider>
    </AddTradeProvider>
    </AddLendingProvider>
    </HideAmountsProvider>
  );
}
