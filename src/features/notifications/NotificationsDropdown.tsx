'use client';

import Link from 'next/link';
import React from 'react';

import { Button, ListRow, Popover, Skeleton, Text } from '@/components/ds';
import { appHref } from '@/features/shell/routes';
import { useNotificationFeed } from '@/lib/query/hooks/useNotifications';

import { notificationHref, timeOrDateLabel } from './notificationsModel';

export const DROPDOWN_SIZE = 10;

export interface NotificationsDropdownProps {
  /** Rows that were unread when the bell opened; they stay highlighted while it is open. */
  highlightedIds: ReadonlySet<string>;
}

/** The bell's popover: the latest ten notifications, with a link to the full page. */
export function NotificationsDropdown({ highlightedIds }: NotificationsDropdownProps) {
  const { data, isLoading, error, refetch } = useNotificationFeed(0, DROPDOWN_SIZE);
  const items = data?.content ?? [];

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <div data-testid="notifications-skeleton">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-space-6 px-space-16 py-space-10">
            <Skeleton height={14} width="70%" />
            <Skeleton height={12} width="50%" />
          </div>
        ))}
      </div>
    );
  } else if (error) {
    body = (
      <div className="flex flex-col items-start gap-space-4 px-space-12 py-space-8">
        <Text variant="body" tone="ink-3">
          Couldn&apos;t load notifications.
        </Text>
        <Button variant="link" size="sm" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <Text as="p" variant="body" tone="ink-3" className="px-space-12 py-space-8">
        No notifications yet.
      </Text>
    );
  } else {
    body = items.map((n) => {
      const href = notificationHref(n);
      const row = (
        <ListRow
          key={n.id}
          data-testid="notification-row"
          highlighted={highlightedIds.has(n.id)}
          title={n.title}
          subtitle={[n.body, timeOrDateLabel(n.createdAt)].filter(Boolean).join(' · ')}
          asChild={href !== null}
        >
          {href ? <Link href={href} prefetch={false} /> : undefined}
        </ListRow>
      );
      return href ? (
        <Popover.Close key={n.id} asChild>
          {row}
        </Popover.Close>
      ) : (
        row
      );
    });
  }

  return (
    <>
      <Text as="div" variant="heading" className="px-space-12 pt-space-8 pb-space-4">
        Notifications
      </Text>
      {body}
      <div className="flex px-space-12 pt-space-4 pb-space-4">
        <Text variant="label" as="span">
          <Popover.Close asChild>
            <Button variant="link" size="sm" asChild>
              <Link href={appHref('/notifications')}>See all</Link>
            </Button>
          </Popover.Close>
        </Text>
      </div>
    </>
  );
}
