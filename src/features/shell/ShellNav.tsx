'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

import { Rail, TabBar } from '@/components/ds';

import {
  getActiveNavItem,
  shellFooterItems,
  shellRailGroups,
  shellTabBarItems,
} from './navigation';

export function ShellTabBar() {
  const pathname = usePathname();
  const current = getActiveNavItem(pathname);

  return <TabBar items={shellTabBarItems} current={current} />;
}

export function ShellRail({
  user,
}: {
  user?: { name?: string; email?: string };
}) {
  const pathname = usePathname();
  const current = getActiveNavItem(pathname);

  return (
    <Rail
      groups={shellRailGroups}
      footer={shellFooterItems}
      current={current}
      brandHref="/ds"
      user={user}
    />
  );
}
