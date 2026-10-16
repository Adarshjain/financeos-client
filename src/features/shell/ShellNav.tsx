'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState } from 'react';

import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  Icon,
  ListRow,
  Rail,
  TabBar,
} from '@/components/ds';

import {
  getActiveNavItem,
  shellFooterItems,
  shellMoreGroups,
  shellQuickAddItems,
  shellRailGroups,
  shellTabBarItems,
} from './navigation';

export function ShellTabBar({
  user,
}: {
  user?: { name?: string; email?: string; initials?: string };
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const current = getActiveNavItem(pathname);
  const [moreOpen, setMoreOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close sheet on route change
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMoreOpen(false);
  }

  const handleSelect = (id: string) => {
    if (id === 'more') {
      setMoreOpen((prev) => !prev);
    } else {
      setMoreOpen(false);
      const item = shellTabBarItems.find((it) => it.id === id);
      if (item?.href) {
        router.push(item.href);
      }
    }
  };

  const displayName = user?.name || 'Arjun Mehta';
  const derivedInitials =
    user?.initials ??
    (user?.name
      ? user.name
          .split(' ')
          .map((p) => p[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'AM');

  return (
    <>
      <Dialog open={moreOpen} onOpenChange={setMoreOpen} modal={false}>
        <DialogContent
          size="sm"
          srTitle="More"
          showClose={false}
          onPointerDownOutside={(e) => {
            const eventWithDetail = e as unknown as { detail?: { originalEvent?: Event } };
            const target = eventWithDetail.detail?.originalEvent?.target;
            if (target instanceof HTMLElement && target.closest('nav[aria-label="Primary"]')) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const eventWithDetail = e as unknown as { detail?: { originalEvent?: Event } };
            const target = eventWithDetail.detail?.originalEvent?.target;
            if (target instanceof HTMLElement && target.closest('nav[aria-label="Primary"]')) {
              e.preventDefault();
            }
          }}
          className="lg:hidden bg-canvas border-line"
        >
          <div className="px-space-16 pt-space-8 pb-tab-bar-clearance overflow-y-auto space-y-space-12 font-text">
            {/* Quick add */}
            <div>
              <div className="text-overline font-extrabold uppercase tracking-wider text-ink-4 px-space-2 pt-space-4 pb-space-4">
                Quick add
              </div>
              <div className="grid grid-cols-4 gap-space-8">
                {shellQuickAddItems.map((item) =>
                  item.disabled ? (
                    <Button
                      key={item.id}
                      variant="tile"
                      iconPosition="top"
                      icon={<Icon name={item.icon} size="lg" />}
                      disabled
                    >
                      {item.label}
                    </Button>
                  ) : (
                    <Button
                      key={item.id}
                      variant="tile"
                      iconPosition="top"
                      icon={<Icon name={item.icon} size="lg" />}
                      asChild
                    >
                      <Link href={item.href!} onClick={() => setMoreOpen(false)}>
                        {item.label}
                      </Link>
                    </Button>
                  ),
                )}
              </div>
            </div>

            {/* Sections */}
            {shellMoreGroups.map((group) => (
              <div key={group.label}>
                <div className="text-overline font-extrabold uppercase tracking-wider text-ink-4 px-space-2 pt-space-4 pb-space-4">
                  {group.label}
                </div>
                <div className="grid grid-cols-2 gap-space-8">
                  {group.items.map((item) => (
                    <Button
                      key={item.id}
                      variant="tile"
                      iconPosition="start"
                      icon={<Icon name={item.icon} size="lg" />}
                      asChild
                    >
                      <Link href={item.href} onClick={() => setMoreOpen(false)}>
                        {item.label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            ))}

            {/* Profile row */}
            <ListRow
              asChild
              leading={
                <Avatar
                  variant="person"
                  size="sm"
                  initials={derivedInitials}
                >
                  {derivedInitials}
                </Avatar>
              }
              title={displayName}
              subtitle="Settings · connections · notifications"
              chevron
              borderTop={false}
              className="mt-space-16 border border-line rounded-ds-lg bg-surface no-underline"
            >
              <Link href="/settings" onClick={() => setMoreOpen(false)} />
            </ListRow>
          </div>
        </DialogContent>
      </Dialog>

      <TabBar
        items={shellTabBarItems}
        current={moreOpen ? 'more' : current}
        onSelect={handleSelect}
        style={moreOpen ? { zIndex: 'calc(var(--ds-z-overlay) + 1)' } : undefined}
      />
    </>
  );
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
