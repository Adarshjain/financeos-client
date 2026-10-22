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
import { Logo } from '@/components/organisms';
import { useAddLending } from '@/features/lendings/form/AddLendingProvider';
import { useAddTransaction } from '@/features/transactions/form/AddTransactionProvider';
import { useNeedsReviewCount } from '@/features/transactions/useNeedsReviewCount';
import { useInboxSummary } from '@/lib/query/hooks/useInbox';

import {
  getActiveNavItem,
  shellMoreGroups,
  shellQuickAddItems,
  shellRailGroups,
  shellTabBarItems,
} from './navigation';
import { usePendingPath } from './navigationStore';
import { appHref, DS_HOME_HREF } from './routes';

type NavCount = { count: number; countTone: 'danger' | 'warning' };

/**
 * The counts on the rail and tab bar: Inbox (act now + needs a look) and Transactions (needs review);
 * nothing while a count loads or is zero.
 */
function useNavCounts(): Record<string, NavCount> {
  const { data: inbox } = useInboxSummary();
  const { data: review } = useNeedsReviewCount();
  const counts: Record<string, NavCount> = {};
  if (inbox?.badge) counts.inbox = { count: inbox.badge, countTone: 'danger' };
  if (review) counts.transactions = { count: review, countTone: 'warning' };
  return counts;
}

export interface ShellUser {
  name?: string;
  email: string;
  avatar?: string;
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
  // A clicked nav item reads as current at once, before the page commits.
  const pendingPath = usePendingPath();
  const current = (pendingPath && getActiveNavItem(pendingPath)) || getActiveNavItem(pathname);
  const counts = useNavCounts();
  const addLending = useAddLending();
  const addTransaction = useAddTransaction();
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
          onClose={() => setMoreOpen(false)}
          className="desk:hidden"
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
                  item.dialog === 'transaction' ? (
                    <Button
                      key={item.id}
                      variant="secondary"
                      layout="stacked"
                      icon={<Icon name={item.icon} size="lg" />}
                      onClick={() => {
                        setMoreOpen(false);
                        addTransaction.open();
                      }}
                    >
                      {item.label}
                    </Button>
                  ) : item.dialog === 'lending' ? (
                    <Button
                      key={item.id}
                      variant="secondary"
                      layout="stacked"
                      icon={<Icon name={item.icon} size="lg" />}
                      onClick={() => {
                        setMoreOpen(false);
                        addLending.open();
                      }}
                    >
                      {item.label}
                    </Button>
                  ) : item.disabled ? (
                    <Button
                      key={item.id}
                      variant="secondary"
                      layout="stacked"
                      icon={<Icon name={item.icon} size="lg" />}
                      disabled
                    >
                      {item.label}
                    </Button>
                  ) : (
                    <Button
                      key={item.id}
                      variant="secondary"
                      layout="stacked"
                      icon={<Icon name={item.icon} size="lg" />}
                      asChild
                    >
                      <Link href={appHref(item.href!)} prefetch={false} onClick={() => setMoreOpen(false)}>
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
                      variant="secondary"
                      size="xl"
                      className="w-full justify-start"
                      icon={<Icon name={item.icon} size="lg" />}
                      asChild
                    >
                      <Link href={appHref(item.href)} prefetch={false} onClick={() => setMoreOpen(false)}>
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
                    variant="circle"
                    tone="brand"
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
                <Link href={appHref('/settings')} prefetch={false} onClick={() => setMoreOpen(false)} />
              </ListRow>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <TabBar
        items={shellTabBarItems.map((item) =>
          item.href
            ? {
                ...item,
                ...counts[item.id],
                asChild: true,
                children: <Link href={appHref(item.href)} prefetch={false} />,
              }
            : item,
        )}
        current={moreOpen ? 'more' : current}
        onSelect={handleSelect}
      />
    </>
  );
}

// Shell links to a page not built in Dinero lead to Legacy routes, a different root layout (full page
// load). They set prefetch={false} so Dinero pages do not preload Legacy CSS and Inter.
export function ShellRail({
  user,
}: {
  user: ShellUser;
}) {
  const pathname = usePathname();
  // A clicked nav item reads as current at once, before the page commits.
  const pendingPath = usePendingPath();
  const current = (pendingPath && getActiveNavItem(pendingPath)) || getActiveNavItem(pathname);
  const counts = useNavCounts();
  const profileText = user.name?.trim() || user.email;
  const initials = getInitials(profileText);

  return (
    <Rail
      groups={shellRailGroups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          ...counts[item.id],
          asChild: true,
          children: <Link href={appHref(item.href)} prefetch={false} />,
        })),
      }))}
      value={current}
      brand={
        <Link href={DS_HOME_HREF}>
          <Logo variant="full" size="sm" />
        </Link>
      }
      footer={
        <ListRow
          asChild
          leading={
            <Avatar
              variant="circle"
              tone="brand"
              size="sm"
              src={user.avatar}
              initials={initials}
            >
              {initials}
            </Avatar>
          }
          title={profileText}
          subtitle={user.name?.trim() ? user.email : undefined}
          borderTop={false}
          className="px-space-8"
        >
          <Link href={appHref('/settings')} prefetch={false} />
        </ListRow>
      }
    />
  );
}
