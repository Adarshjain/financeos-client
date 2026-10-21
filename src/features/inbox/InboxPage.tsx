'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Badge, Banner, Card, Divider, EmptyState, SectionHeader, Text } from '@/components/ds';
import { ErrorState } from '@/components/organisms';
import type { InboxItemResponse } from '@/lib/api/types';
import { useInbox } from '@/lib/query/hooks/useInbox';

import { INBOX_SECTIONS, type InboxSectionKey } from './inbox.helpers';
import type { PendingBillAction } from './inboxBillAction';
import { InboxBillHost } from './InboxBillHost';
import { dsInboxNotifier } from './inboxNotifier';
import { InboxRow } from './InboxRow';
import { INBOX_SECTION_TITLES, pendingFor, type RowButton } from './inboxRows';
import { InboxSkeleton } from './InboxSkeleton';
import { UPCOMING_HREF } from './inboxUpcomingTabs';
import { useInboxActions } from './useInboxActions';
import { useInboxDeepLink } from './useInboxDeepLink';

const SECTION_TONE = { act_now: 'danger', needs_look: 'warning', info: 'neutral' } as const;

export interface InboxPageProps {
  /** ?item=<key> from a notification: scroll to that row and highlight it. */
  highlightKey?: string | null;
}

/** The Inbox tab: Act now and Needs a look in one card, plus the dialogs rows open. */
export function InboxPage({ highlightKey = null }: InboxPageProps) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useInbox();
  const { snooze, dismiss } = useInboxActions(dsInboxNotifier);
  const [pendingBill, setPendingBill] = React.useState<PendingBillAction | null>(null);
  const closeBill = React.useCallback(() => setPendingBill(null), []);

  // Updates live in Notifications; the server still sends them for Legacy.
  const items = React.useMemo(() => (data?.items ?? []).filter((i) => i.section !== 'info'), [data]);
  const deepLink = useInboxDeepLink(highlightKey, data ? items : null);

  const onBillButton = (item: InboxItemResponse, button: RowButton) => {
    const pending = pendingFor(item, button);
    if (pending) setPendingBill(pending);
  };

  let body: React.ReactNode;
  if (isLoading) {
    body = <InboxSkeleton />;
  } else if (error) {
    body = (
      <Card>
        <ErrorState
          title="Couldn't load the inbox"
          description="The server did not answer. Your items are safe."
          action={{ label: 'Try again', onSelect: () => void refetch() }}
        />
      </Card>
    );
  } else if (items.length === 0) {
    body = (
      <Card>
        <EmptyState
          title="All clear"
          description="Nothing needs you right now. New bills, statements and reviews show up here."
          action={{ label: 'Upcoming', onSelect: () => router.push(UPCOMING_HREF), variant: 'secondary' }}
          secondaryAction={{ label: 'Transactions', onSelect: () => router.push('/transactions') }}
        />
      </Card>
    );
  } else {
    body = (
      <>
        <Card>
          {INBOX_SECTIONS.filter(({ key }) => key !== 'info').map(({ key }) => (
            <InboxSection
              key={key}
              sectionKey={key}
              items={items.filter((i) => i.section === key)}
              highlightKey={deepLink.found ? highlightKey : null}
              onBillButton={onBillButton}
              onSnooze={(item, until) => snooze(item.key, until)}
              onDismiss={(item) => dismiss(item.key)}
            />
          ))}
        </Card>
        <Text as="p" variant="caption" tone="ink-3" className="desk:hidden">
          <Text as="strong" variant="caption" tone="ink">
            Swipe
          </Text>{' '}
          a row right to snooze it until tomorrow, left to dismiss it. Rows that can&apos;t be snoozed or
          dismissed don&apos;t swipe.
        </Text>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      {deepLink.missing ? <Banner tone="info">That item is already handled.</Banner> : null}
      {body}
      <InboxBillHost pending={pendingBill} onClose={closeBill} />
    </div>
  );
}

interface InboxSectionProps extends Omit<React.ComponentProps<typeof InboxRow>, 'item' | 'highlighted'> {
  sectionKey: InboxSectionKey;
  items: InboxItemResponse[];
  highlightKey: string | null;
}

/** One section header with its count, then its rows; an empty section draws nothing. */
function InboxSection({ sectionKey, items, highlightKey, ...handlers }: InboxSectionProps) {
  if (items.length === 0) return null;
  return (
    <section data-testid={`inbox-section-${sectionKey}`}>
      <SectionHeader
        as="h2"
        variant="strong"
        sticky={false}
        borderTop={false}
        meta={<Badge tone={SECTION_TONE[sectionKey]}>{items.length}</Badge>}
      >
        {INBOX_SECTION_TITLES[sectionKey]}
      </SectionHeader>
      {items.map((item, index) => (
        <React.Fragment key={item.key}>
          {index > 0 ? <Divider /> : null}
          <InboxRow item={item} highlighted={item.key === highlightKey} {...handlers} />
        </React.Fragment>
      ))}
    </section>
  );
}
