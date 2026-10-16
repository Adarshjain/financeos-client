import React from 'react';

import { TopBar } from '@/components/ds';
import { ShellRail, ShellTabBar } from '@/features/shell/ShellNav';
import { requireAuth } from '@/lib/auth';

export default async function DsAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="flex min-h-dvh">
      {/* Desktop Rail (hidden below lg) */}
      <div className="hidden lg:flex shrink-0 h-dvh sticky top-0">
        <ShellRail
          user={{
            name: user.displayName ?? undefined,
            email: user.email,
          }}
        />
      </div>

      {/* Main content column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-dvh">
        <TopBar title="New design" />
        <main className="flex-1 p-space-16 lg:p-space-24 pb-bottom-clearance lg:pb-space-24">
          {children}
        </main>
      </div>

      {/* Phone floating TabBar (hidden from lg) */}
      <ShellTabBar
        user={{
          name: user.displayName ?? undefined,
          email: user.email,
        }}
      />
    </div>
  );
}
