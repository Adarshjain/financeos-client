import React from 'react';

import { TopBar } from '@/components/ds';
import { Logo } from '@/components/organisms';
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
        <TopBar title="New design" leading={<Logo variant="mark" />} />
        <main className="flex-1 p-space-16 desk:p-space-24 pb-bottom-clearance desk:pb-space-24">
          {children}
        </main>
      </div>

      {/* Phone floating TabBar (hidden from desk) */}
      <ShellTabBar
        user={{
          name: user.displayName ?? undefined,
          email: user.email,
        }}
      />
    </div>
  );
}
