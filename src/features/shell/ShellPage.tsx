'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';

import { TopBar, type TopBarAction, type TopBarMenuItem } from '@/components/ds';
import { Logo } from '@/components/organisms';
import { useNotificationsAction } from '@/features/notifications/useNotificationsAction';

import { isChatPath } from './navigation';
import { hasInAppHistory } from './navigationStore';
import { appHref } from './routes';
import { useSearch } from './search/SearchProvider';

/** Top-bar actions every /ds page gets after Search (boards D-accounts, P-accounts), matching the live routes. */
export const shellTopBarActions: TopBarAction[] = [
  {
    id: 'chat',
    icon: 'chat',
    label: 'Ask the data',
    asChild: true,
    children: <Link href={appHref('/chat')} prefetch={false} />,
  },
];

export interface ShellPageProps {
  title: React.ReactNode;
  crumb?: React.ReactNode;
  /** Where the + goes. Without it the bar has no add action. */
  addHref?: string;
  /** A same-page add: the + calls this (e.g. opens a dialog) instead of navigating. Wins over addHref. */
  onAdd?: () => void;
  /** The + opens a dropdown of these rows instead of one add. Wins over onAdd and addHref. */
  addMenu?: TopBarMenuItem[];
  addLabel?: string;
  /** Where the phone back button goes (detail pages). Replaces the leading logo on phone; without it the bar shows the logo. */
  backHref?: string;
  /** The content starts with a tab strip: no space between the top bar and it. */
  flushTop?: boolean;
  children: React.ReactNode;
}

/**
 * Back click handler: browser back when the user arrived from inside the app, else the parent route.
 * The router is optional so the page still renders outside an app router (tests, Storybook).
 */
function useBack(backHref?: string) {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    router = null;
  }
  if (!backHref) return undefined;
  return () => {
    if (hasInAppHistory()) {
      if (router) router.back();
      else window.history.back();
    } else if (router) router.push(backHref);
    else window.location.assign(backHref);
  };
}

/** The current pathname; null outside an app router (tests, Storybook). */
function useCurrentPath(): string | null {
  try {
     
    return usePathname();
  } catch {
    return null;
  }
}

/** One signed-in page: the top bar with this page's title and +, then the content area. */
export function ShellPage({
  title,
  crumb,
  addHref,
  onAdd,
  addMenu,
  addLabel,
  backHref,
  flushTop,
  children,
}: ShellPageProps) {
  const notifications = useNotificationsAction();
  const onBack = useBack(backHref);
  const { open: openSearch } = useSearch();
  // The Ask the data shortcut is left out of the bar on the Ask the data pages themselves.
  const onChatPage = isChatPath(useCurrentPath());
  return (
    <>
      <TopBar
        data-view-transition="header"
        className="sticky top-0 z-sticky"
        title={title}
        crumb={crumb}
        leading={backHref ? undefined : <Logo variant="mark" />}
        backHref={backHref}
        onBack={onBack}
        actions={[
          notifications,
          { id: 'search', icon: 'search' as const, label: 'Search', phoneOnly: true, onSelect: openSearch },
          ...shellTopBarActions.filter((a) => !(onChatPage && a.id === 'chat')),
          ...(addMenu
            ? [
                {
                  id: 'add',
                  icon: 'add' as const,
                  label: addLabel ?? 'Add',
                  variant: 'primary' as const,
                  showLabel: true,
                  labelIconSize: 'xs' as const,
                  menu: addMenu,
                },
              ]
            : onAdd
            ? [
                {
                  id: 'add',
                  icon: 'add' as const,
                  label: addLabel ?? 'Add',
                  variant: 'primary' as const,
                  showLabel: true,
                  labelIconSize: 'xs' as const,
                  onSelect: onAdd,
                },
              ]
            : addHref
            ? [
                {
                  id: 'add',
                  icon: 'add' as const,
                  label: addLabel ?? 'Add',
                  variant: 'primary' as const,
                  showLabel: true,
                  labelIconSize: 'xs' as const,
                  asChild: true,
                  children: <Link href={addHref} />,
                },
              ]
            : []),
        ]}
      />
      {/* Sticky headers inside the content stop under the sticky top bar (its height, notch included);
          isolate keeps their z-sticky inside the content, so the bar always draws above them. */}
      <main
        className={`isolate flex-1 [--ds-sticky-top:theme(spacing.safe-56)] p-space-16 desk:p-space-24 pb-bottom-clearance desk:pb-space-24${flushTop ? ' pt-0 desk:pt-0' : ''}`}
      >
        {children}
      </main>
    </>
  );
}
