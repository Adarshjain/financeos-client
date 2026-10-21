'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import {
  Button,
  Card,
  Dialog,
  DialogContent,
  Divider,
  EmptyState,
  Icon,
  ListRow,
  Pager,
  SectionHeader,
  Text,
} from '@/components/ds';
import { ErrorState } from '@/components/organisms';
import { ShellPage } from '@/features/shell/ShellPage';
import { useUrlState } from '@/features/upcoming/useUrlState';
import type { AppNotification } from '@/lib/api/types';
import { useNotificationFeed, useNotificationMutations } from '@/lib/query/hooks/useNotifications';

import { groupByDay, notificationHref, NOTIFICATIONS_PAGE_SIZE, parsePage, timeLabel } from './notificationsModel';
import { NotificationsSkeleton } from './NotificationsSkeleton';
import { useNotificationActions } from './useNotificationActions';

/** /ds/notifications: the full feed by day, newest first, with clear one, clear all and a pager. */
export function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useUrlState(searchParams.toString(), parsePage);
  const { data, isLoading, isFetching, error, refetch } = useNotificationFeed(page, NOTIFICATIONS_PAGE_SIZE);
  const { markRead } = useNotificationMutations();
  const { clearOne, clearEverything, clearing, clearingAll } = useNotificationActions();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [seen, setSeen] = React.useState<{ page: number; unreadIds: ReadonlySet<string> } | null>(null);

  const items = React.useMemo(() => data?.content ?? [], [data]);
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
    (p: number, replace = false) => {
      setPage(p);
      const url = p > 0 ? `/ds/notifications?page=${p}` : '/ds/notifications';
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router, setPage],
  );

  // Clearing the last row of a later page leaves it empty: step back once the server agrees.
  React.useEffect(() => {
    if (loaded && !clearing && !isFetching && items.length === 0 && page > 0) goToPage(page - 1, true);
  }, [loaded, clearing, isFetching, items.length, page, goToPage]);

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
  if (isLoading) {
    body = <NotificationsSkeleton />;
  } else if (error) {
    body = (
      <Card>
        <ErrorState
          title="Couldn't load notifications"
          description="The server did not answer. Nothing was lost."
          action={{ label: 'Try again', onSelect: () => void refetch() }}
        />
      </Card>
    );
  } else if (items.length === 0) {
    body = (
      <Card>
        <EmptyState title="No notifications" description="Finished imports, syncs and rewards show up here." />
      </Card>
    );
  } else {
    body = (
      <Card
        action={
          <Button variant="link" size="sm" onClick={() => setConfirmOpen(true)}>
            Clear all
          </Button>
        }
      >
        {pager}
        {groupByDay(items).map((group) => (
          <section key={group.label} data-testid="notification-day">
            <SectionHeader as="h2" variant="strong" sticky={false} borderTop={false}>
              {group.label}
            </SectionHeader>
            {group.items.map((n, index) => (
              <React.Fragment key={n.id}>
                {index > 0 ? <Divider /> : null}
                <NotificationRow
                  n={n}
                  highlighted={seen?.page === page && seen.unreadIds.has(n.id)}
                  onOpen={(href) => router.push(href)}
                  onClear={() => void clearOne(n)}
                />
              </React.Fragment>
            ))}
          </section>
        ))}
        {pager}
      </Card>
    );
  }

  return (
    <ShellPage title="Notifications">
      {body}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          size="sm"
          title="Clear all notifications?"
          description={`This removes ${totalElements === 1 ? '1 notification' : `all ${totalElements} notifications`}. New ones still show up here.`}
          secondary={{ label: 'Cancel', onSelect: () => setConfirmOpen(false) }}
          primary={{
            label: 'Clear all',
            destructive: true,
            disabled: clearingAll,
            onSelect: () => {
              void clearEverything().then((ok) => {
                if (ok) {
                  setConfirmOpen(false);
                  goToPage(0, true);
                }
              });
            },
          }}
        />
      </Dialog>
    </ShellPage>
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
