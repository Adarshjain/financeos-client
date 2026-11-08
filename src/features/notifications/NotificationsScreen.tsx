'use client';

import { useSearchParams } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Divider } from '@/components/ds/Divider/Divider';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { Icon } from '@/components/ds/Icon/Icon';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Pager } from '@/components/ds/Pager/Pager';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { Text } from '@/components/ds/Text/Text';
import { LoadError } from '@/features/shell/LoadError';
import { pageHref } from '@/features/shell/pagination';
import { appHref } from '@/features/shell/routes';
import { useUrlState } from '@/features/upcoming/useUrlState';
import type { AppNotification } from '@/lib/api/types';
import { useNotificationFeed, useNotificationMutations as useFeedMutations } from '@/lib/query/hooks/useNotifications';
import { useAppRouter } from '@/lib/useAppRouter';
import { ListTransition, RowTransition, useDeferredRows } from '@/lib/viewTransition';

import { groupByDay, notificationHref, NOTIFICATIONS_PAGE_SIZE, pageFromSearch, timeLabel } from './notificationsModel';
import { NotificationsSkeleton } from './NotificationsSkeleton';
import { useNotificationMutations } from './useNotificationMutations';

/** /inbox/updates: the full feed by day, newest first, with clear one, clear all and a pager. */
export function NotificationsScreen() {
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useUrlState(searchParams.toString(), pageFromSearch);
  const { data, isLoading, isFetching, error, refetch } = useNotificationFeed(page, NOTIFICATIONS_PAGE_SIZE);
  const { markRead } = useFeedMutations();
  const { clearOne, clearEverything, clearing, clearingAll } = useNotificationMutations();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [seen, setSeen] = React.useState<{ page: number; unreadIds: ReadonlySet<string> } | null>(null);

  const items = React.useMemo(() => data?.content ?? [], [data]);
  // Clearing one takes it out of the cache at once; the deferred rows let it fold away.
  const shownItems = useDeferredRows(items);
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  // Rows unread when this page loaded stay highlighted, then the page marks what it shows as read.
  const loaded = data !== undefined;
  if (loaded && seen?.page !== page) {
    setSeen({ page, unreadIds: new Set(items.filter((n) => !n.read).map((n) => n.id)) });
  }
  const unreadCount = seen?.page === page ? seen.unreadIds.size : 0;
  const newestCreatedAt = items[0]?.createdAt;
  const markedFor = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!loaded || markedFor.current === page) return;
    markedFor.current = page;
    // The newest row's timestamp exactly as the server sent it.
    if (unreadCount > 0 && newestCreatedAt) markRead.mutate(newestCreatedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, page, unreadCount, newestCreatedAt]);

  const goToPage = React.useCallback(
    (p: number) => {
      setPage(p);
      const url = appHref(pageHref('/inbox/updates', {}, p));
      router.replace(url, { scroll: false });
    },
    [router, setPage],
  );

  // An emptied page is not an empty feed. Past the last page, move to the last one that has items; on a page
  // that should have items (the next ones shifted up), ask the server again once per page and fetch.
  const refetchedFor = React.useRef<string | null>(null);
  const [gaveUp, setGaveUp] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!loaded || clearing || isFetching || items.length > 0) return;
    if (totalElements === 0) {
      if (page > 0) goToPage(0);
      return;
    }
    const last = Math.max(totalPages - 1, 0);
    if (page > last) {
      goToPage(last);
      return;
    }
    const stamp = `${page}:${totalElements}`;
    if (refetchedFor.current !== stamp) {
      refetchedFor.current = stamp;
      // Still empty after the refetch (the count and the list disagree): show the normal empty state.
      void refetch().then(() => setGaveUp(stamp));
    }
  }, [loaded, clearing, isFetching, items.length, totalElements, totalPages, page, goToPage, refetch]);

  const pager =
    totalPages > 1 ? (
      <Pager
        variant="compact"
        page={page}
        size={NOTIFICATIONS_PAGE_SIZE}
        totalElements={totalElements}
        totalPages={totalPages}
        unit="notifications"
        onPageChange={goToPage}
      />
    ) : null;

  let body: React.ReactNode;
  if (isLoading || (!error && items.length === 0 && totalElements > 0 && gaveUp !== `${page}:${totalElements}`)) {
    body = <NotificationsSkeleton />;
  } else if (error) {
    body = (
      <Card>
        <LoadError what="notifications" retry={() => void refetch()} retrying={isFetching} />
      </Card>
    );
  } else if (items.length === 0) {
    body = (
      <Card>
        <EmptyState title="No notifications yet" description="Finished imports, syncs and rewards show up here." />
      </Card>
    );
  } else {
    body = (
      <ListTransition>
        <Card
          action={
            <Text variant="label" as="span">
              <Button variant="link" size="sm" onClick={() => setConfirmOpen(true)}>
                Clear all
              </Button>
            </Text>
          }
        >
          {pager}
          {groupByDay(shownItems).map((group) => (
            <RowTransition key={group.label}>
              <section data-testid="notification-day">
                <SectionHeader as="h2" variant="strong" sticky={false} borderTop={false}>
                  {group.label}
                </SectionHeader>
                {group.items.map((n, index) => (
                  <RowTransition key={n.id}>
                    {index > 0 ? <Divider /> : null}
                    <NotificationRow
                      n={n}
                      highlighted={seen?.page === page && seen.unreadIds.has(n.id)}
                      onOpen={(href) => router.push(href)}
                      onClear={() => void clearOne(n)}
                    />
                  </RowTransition>
                ))}
              </section>
            </RowTransition>
          ))}
          {pager}
        </Card>
      </ListTransition>
    );
  }

  return (
    <>
      {body}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Content
          size="sm"
          title="Clear all notifications?"
          description={`This removes ${totalElements === 1 ? '1 notification' : `all ${totalElements} notifications`}. New ones still show up here.`}
          secondary={{ label: 'Cancel', onSelect: () => setConfirmOpen(false), disabled: clearingAll }}
          primary={{
            label: 'Clear all',
            tone: 'danger',
            loading: clearingAll,
            onSelect: () => {
              void clearEverything().then((ok) => {
                if (ok) {
                  setConfirmOpen(false);
                  goToPage(0);
                }
              });
            },
          }}
        />
      </Dialog>
    </>
  );
}

interface NotificationRowProps {
  n: AppNotification;
  highlighted: boolean;
  onOpen: (href: string) => void;
  onClear: () => void;
}

function NotificationRow({ n, highlighted, onOpen, onClear }: NotificationRowProps) {
  const href = notificationHref(n);
  return (
    <ListRow
      data-testid="notification-row"
      wrap
      borderTop={false}
      highlighted={highlighted}
      title={n.title}
      subtitle={n.body || undefined}
      clickable={href !== null}
      onClick={href ? () => onOpen(href) : undefined}
      trailing={
        <>
          <Text variant="caption" tone="ink-3">
            {timeLabel(n.createdAt)}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Clear"
            icon={<Icon name="close" size="sm" />}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          />
        </>
      }
    />
  );
}
