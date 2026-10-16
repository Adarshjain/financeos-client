import React from 'react';

import { Rail, TabBar, TopBar } from '@/components/ds';
import {
  shellFooterItems,
  shellRailGroups,
  shellTabBarItems,
} from '@/features/shell/navigation';
import { requireAuth } from '@/lib/auth';

export default async function DsAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Desktop Rail (hidden below lg) */}
      <div className="hidden lg:flex shrink-0 h-dvh sticky top-0">
        <Rail
          groups={shellRailGroups}
          footer={shellFooterItems}
          brandHref="/ds"
          user={{
            name: user.email.split('@')[0],
            email: user.email,
          }}
        />
      </div>

      {/* Main content column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-dvh">
        <TopBar title="New design" />
        <main className="flex-1 p-space-16 lg:p-space-24 pb-tab-bar-clearance lg:pb-space-24">
          {children}
        </main>
      </div>

      {/* Phone floating TabBar (hidden from lg) */}
      <TabBar items={shellTabBarItems} current="home" />
    </div>
  );
}
