'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';

import {
  Avatar,
  Button,
  Card,
  Dialog,
  DialogContent,
  Icon,
  ListRow,
  Rail,
  TabBar,
  Text,
} from '@/components/ds';

import {
  getActiveNavItem,
  shellFooterItems,
  shellMoreGroups,
  shellQuickAddItems,
  shellRailGroups,
  shellTabBarItems,
} from './navigation';

export interface ShellUser {
  name?: string;
  email: string;
}

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return text.trim().slice(0, 2).toUpperCase();
}

export function ShellTabBar({
  user,
}: {
  user: ShellUser;
}) {
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
      setMoreOpen(true);
    } else {
      setMoreOpen(false);
    }
  };

  const profileText = user.name?.trim() || user.email;
  const initials = getInitials(profileText);

  return (
    <>
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent
          size="sm"
          srTitle="More"
          showClose={false}
          background="canvas"
          className="lg:hidden"
        >
          <div className="px-space-16 pt-space-8 pb-safe-12 overflow-y-auto space-y-space-12">
            {/* Quick add */}
            <div>
              <div className="px-space-2 pt-space-4 pb-space-4">
                <Text variant="overline" tone="ink-4">
                  Quick add
                </Text>
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
                <div className="px-space-2 pt-space-4 pb-space-4">
                  <Text variant="overline" tone="ink-4">
                    {group.label}
                  </Text>
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
            <Card className="mt-space-16">
              <ListRow
                asChild
                leading={
                  <Avatar
                    variant="person"
                    size="sm"
                    initials={initials}
                  >
                    {initials}
                  </Avatar>
                }
                title={profileText}
                subtitle="Settings · connections · notifications"
                chevron
                borderTop={false}
              >
                <Link href="/settings" onClick={() => setMoreOpen(false)} />
              </ListRow>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <TabBar
        items={shellTabBarItems}
        current={moreOpen ? 'more' : current}
        onSelect={handleSelect}
      />
    </>
  );
}

export function ShellRail({
  user,
}: {
  user: ShellUser;
}) {
  const pathname = usePathname();
  const current = getActiveNavItem(pathname);
  const profileText = user.name?.trim() || user.email;
  const initials = getInitials(profileText);

  return (
    <Rail
      groups={shellRailGroups}
      footer={shellFooterItems}
      current={current}
      brandHref="/ds"
      user={{
        name: profileText,
        email: user.email,
        initials,
      }}
    />
  );
}
