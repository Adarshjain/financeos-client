'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { TopBar, type TopBarAction, type TopBarMenuItem } from '@/components/ds';
import { Logo } from '@/components/organisms';
import { useNotificationsAction } from '@/features/notifications/useNotificationMutations';

import { crumbParentHref, trimCrumb } from './crumbTrail';
import { hasInAppHistory } from './navigationStore';
import { useSearch } from './search/SearchProvider';

export interface ShellPageProps {
  title: React.ReactNode;
  crumb?: React.ReactNode;
  /** Where the + goes. Without it the bar has no add action. */
  addHref?: string;
  /** A same-page add: the + calls this (e.g. opens a dialog) instead of navigating. Wins over addHref. */
  onAdd?: () => void;
  /** The + shows its loading state while its dialog code loads (only with onAdd). */
  addLoading?: boolean;
  /** The + opens a dropdown of these rows instead of one add. Wins over onAdd and addHref. */
  addMenu?: TopBarMenuItem[];
  addLabel?: string;
  /** Where the back button goes. Optional: a crumb two or more deep gives it by itself (the parent list); this overrides that. Without either the bar shows the logo. */
  backHref?: string;
  /** The content starts with a tab strip: no space between the top bar and it, and no back arrow derived from the crumb (tabs are siblings; an explicit backHref still wins). */
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

/** The top bar of a page without backHref: bell and Search, then the page's own add. */
function MainTopBar({ addActions, ...barProps }: React.ComponentProps<typeof TopBar> & { addActions: TopBarAction[] }) {
  const notifications = useNotificationsAction();
  const { open: openSearch } = useSearch();
  return (
    <TopBar
      {...barProps}
      actions={[
        notifications,
        { id: 'search', icon: 'search' as const, label: 'Search', phoneOnly: true, onSelect: openSearch },
        ...addActions,
      ]}
    />
  );
}

/** One signed-in page: the top bar with this page's title and +, then the content area. */
export function ShellPage({
  title,
  crumb: crumbProp,
  addHref,
  onAdd,
  addLoading,
  addMenu,
  addLabel,
  backHref: backHrefProp,
  flushTop,
  children,
}: ShellPageProps) {
  // The crumb never repeats the title; a page below a list (a crumb two or more deep) gets the back arrow without asking.
  const crumb = trimCrumb(crumbProp, title);
  // A page that starts with its area's tab strip (flushTop) is a sibling of the other tabs, not a child: no derived back arrow.
  const backHref = backHrefProp ?? (flushTop ? undefined : crumbParentHref(crumb));
  const onBack = useBack(backHref);
  // Detail pages (backHref) keep only back, title and their own add/menu: no bell or Search.
  const addActions: TopBarAction[] = [
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
            loading: addLoading,
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
  ];
  const barProps = {
    'data-view-transition': 'header',
    className: 'sticky top-0 z-sticky',
    title,
    crumb,
    leading: backHref ? undefined : <Logo variant="mark" />,
    backHref,
    onBack,
  };
  return (
    <>
      {backHref ? (
        <TopBar {...barProps} actions={addActions} />
      ) : (
        <MainTopBar {...barProps} addActions={addActions} />
      )}
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
