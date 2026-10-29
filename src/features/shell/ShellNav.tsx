'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';

import {
  Avatar,
  Button,
  Card,
  cn,
  Dialog,
  Icon,
  Kbd,
  ListRow,
  Rail,
  Switch,
  TabBar,
  Text,
  Tooltip,
} from '@/components/ds';
import { Logo } from '@/components/organisms';
import { useNeedsReviewCount } from '@/features/transactions/useNeedsReviewCount';
import { useInboxSummary } from '@/lib/query/hooks/useInbox';

import { useHideAmounts } from './hideAmounts';
import {
  getActiveNavItem,
  hidesTabBar,
  shellMoreGroups,
  shellQuickAddItems,
  shellRailGroups,
  shellTabBarItems,
} from './navigation';
import { usePendingPath } from './navigationStore';
import { useOpenQuickAddDialog, useQuickAddLoading } from './quickAdd';
import { RAIL_COLLAPSED_COOKIE } from './railCollapsedName';
import { appHref, DS_HOME_HREF } from './routes';
import { useSearch } from './search/SearchProvider';
import { useHideOnScroll } from './useHideOnScroll';

const subscribeNever = () => () => undefined;

function saveRailCollapsed(collapsed: boolean): void {
  try {
    document.cookie = `${RAIL_COLLAPSED_COOKIE}=${collapsed ? '1' : '0'}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${
      window.location.protocol === 'https:' ? '; secure' : ''
    }`;
  } catch {
    // Cookies blocked: the choice still holds until the page reloads.
  }
}

type NavCount = { count: number; countTone: 'danger' | 'warning' };

/**
 * The counts on the rail and tab bar: Inbox (act now + needs a look) and Transactions (needs review);
 * nothing while a count loads or is zero.
 */
function useNavCounts(): Record<string, NavCount> {
  const { data: inbox } = useInboxSummary({ shell: true });
  const { data: review } = useNeedsReviewCount({ shell: true });
  // Pages seed these counts into the cache while they render, so what the rail and the tab bar find in it depends on
  // their order in the tree and on when each hydrates. Counts therefore wait for hydration: the server and the first
  // client render both draw none, and they show at once after it.
  const hydrated = React.useSyncExternalStore(subscribeNever, () => true, () => false);
  const counts: Record<string, NavCount> = {};
  if (!hydrated) return counts;
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
  const openQuickAdd = useOpenQuickAddDialog();
  const quickAddLoading = useQuickAddLoading();
  const { hidden, setHidden } = useHideAmounts();
  const [moreOpen, setMoreOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const scrolledAway = useHideOnScroll();

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

  // The Ask the data pages dock their own composer where the bar floats.
  if (hidesTabBar(pathname)) return null;

  return (
    <>
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <Dialog.Content
          size="sm"
          srTitle="Menu"
          showClose={false}
          background="canvas"
          onDismiss={() => setMoreOpen(false)}
          className="desk:hidden"
        >
          <div className="px-space-16 pt-space-8 pb-safe-24 overflow-y-auto space-y-space-8 desk:space-y-space-12">
            {/* Quick add */}
            <div>
              <div className="px-space-2 pt-space-4 pb-space-4">
                <Text variant="overline" tone="ink-4">
                  Quick add
                </Text>
              </div>
              <div className="grid grid-cols-4 gap-space-8">
                {shellQuickAddItems.map((item) =>
                  item.dialog ? (
                    <Button
                      key={item.id}
                      variant="secondary"
                      layout="stacked"
                      icon={<Icon name={item.icon} size="lg" />}
                      loading={quickAddLoading.isLoading(item.dialog)}
                      onPointerDown={() => quickAddLoading.preload(item.dialog!)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && quickAddLoading.preload(item.dialog!)}
                      // The sheet stays open, showing the pressed tile's loading state, until the dialog's code is ready;
                      // it closes in the same update that opens the dialog, so the two modals never stack.
                      onClick={() => void openQuickAdd(item.dialog!, () => setMoreOpen(false))}
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

            {/* Hide amounts */}
            <Card className="mt-space-8 desk:mt-space-16">
              <ListRow
                title="Hide amounts"
                subtitle="Show ₹ — instead of amounts"
                trailing={<Switch checked={hidden} onCheckedChange={setHidden} aria-label="Hide amounts" />}
                borderTop={false}
              />
            </Card>

            {/* Profile row */}
            <Card className="mt-space-8 desk:mt-space-16">
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
        </Dialog.Content>
      </Dialog>

      <TabBar
        data-view-transition="tab-bar"
        // Scrolling down slides the pill below the screen edge (its height plus its bottom offset); up brings it back.
        className={cn(
          'transition-transform duration-base motion-reduce:transition-none',
          scrolledAway && !moreOpen && 'translate-y-[calc(100%+var(--ds-space-12)+env(safe-area-inset-bottom))]',
        )}
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
  initialCollapsed = false,
}: {
  user: ShellUser;
  initialCollapsed?: boolean;
}) {
  const pathname = usePathname();
  // A clicked nav item reads as current at once, before the page commits.
  const pendingPath = usePendingPath();
  const current = (pendingPath && getActiveNavItem(pendingPath)) || getActiveNavItem(pathname);
  const counts = useNavCounts();
  const profileText = user.name?.trim() || user.email;
  const initials = getInitials(profileText);
  const { open: openSearch } = useSearch();
  const [collapsed, setCollapsedState] = useState(initialCollapsed);
  const setCollapsed = (next: boolean) => {
    setCollapsedState(next);
    saveRailCollapsed(next);
  };

  // ⌘B / Ctrl+B toggles the rail, only while it is on screen (desk and up).
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'b') return;
      if (e.defaultPrevented || e.isComposing) return;
      if (!window.matchMedia('(min-width: 641px)').matches) return;
      e.preventDefault();
      setCollapsedState(!collapsed);
      saveRailCollapsed(!collapsed);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [collapsed]);

  return (
    <Rail
      collapsible
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      toggleShortcut="⌘B"
      data-view-transition="rail"
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
      search={
        collapsed ? (
          <Tooltip content="Search (⌘K)" side="right">
            <Button
              type="button"
              variant="secondary"
              size="md"
              iconOnly
              aria-label="Search"
              icon={<Icon name="search" size="md" />}
              onClick={openSearch}
            />
          </Tooltip>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            icon={<Icon name="search" size="md" />}
            onClick={openSearch}
          >
            <span>Search</span>
            <span className="ml-auto">
              <Kbd>⌘K</Kbd>
            </span>
          </Button>
        )
      }
      brand={
        <Link href={DS_HOME_HREF}>
          <Logo variant="full" size="sm" />
        </Link>
      }
      footer={
        collapsed ? (
          <Tooltip content={profileText} side="right">
            <Link href={appHref('/settings')} prefetch={false} aria-label={profileText}>
              <Avatar
                variant="circle"
                tone="brand"
                size="sm"
                src={user.avatar}
                initials={initials}
              >
                {initials}
              </Avatar>
            </Link>
          </Tooltip>
        ) : (
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
        )
      }
    />
  );
}
