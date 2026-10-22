import React from 'react';

import { AddLendingProvider } from '@/features/lendings/form/AddLendingProvider';
import { ShellRail, ShellTabBar } from '@/features/shell/ShellNav';
import { AddTransactionProvider } from '@/features/transactions/form/AddTransactionProvider';
import { requireAuth } from '@/lib/auth';
import { todayInAppZone } from '@/lib/date-range';

export default async function DsAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <AddLendingProvider>
      <AddTransactionProvider today={todayInAppZone()}>
      <div className="flex min-h-dvh">
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
        <div className="flex-1 min-w-0 flex flex-col min-h-dvh">{children}</div>

        {/* Phone floating TabBar (hidden from desk) */}
        <ShellTabBar
          user={{
            name: user.displayName ?? undefined,
            email: user.email,
          }}
        />
      </div>
      </AddTransactionProvider>
    </AddLendingProvider>
  );
}
