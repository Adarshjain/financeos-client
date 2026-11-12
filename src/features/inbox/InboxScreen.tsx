'use client';

import React from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { Card } from '@/components/ds/Card/Card';
import { Divider } from '@/components/ds/Divider/Divider';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { LoadError } from '@/features/shell/LoadError';
import { UPCOMING_HREF } from '@/features/upcoming/upcomingTabs';
import type { InboxItemResponse } from '@/lib/api/types';
import { useInbox } from '@/lib/query/hooks/useInbox';
import { ListTransition, RowTransition } from '@/lib/viewTransition';

import { INBOX_SECTION_TITLES, INBOX_SECTIONS, type InboxSectionKey } from './inboxModel';
import { InboxRow } from './InboxRow';
import { InboxSkeleton } from './InboxSkeleton';
import { useInboxDeepLink } from './useInboxDeepLink';

const SECTION_TONE = { act_now: 'danger', needs_look: 'warning', info: 'neutral' } as const;

export interface InboxScreenProps {
  /** ?item=<key> from an old notification: the screen sends the person to that row's page. */
  highlightKey?: string | null;
}

/** The Inbox tab: what needs attention, one row per page to open. It decides nothing itself. */
export function InboxScreen({ highlightKey = null }: InboxScreenProps) {
  const { data, isLoading, isFetching, error, refetch } = useInbox();
  const items = React.useMemo(() => data?.items ?? [], [data]);
  useInboxDeepLink(highlightKey, data ? items : null);

  let body: React.ReactNode;
  if (isLoading) {
    body = <InboxSkeleton />;
  } else if (error) {
    body = (
      <Card>
        <LoadError what="the inbox" retry={() => void refetch()} retrying={isFetching} />
      </Card>
    );
  } else if (items.length === 0) {
    body = (
      <Card>
        <EmptyState
          title="All clear"
          description="Nothing needs you right now. New bills, statements and reviews show up here."
          action={{ label: 'Upcoming', href: UPCOMING_HREF, variant: 'secondary' }}
          secondaryAction={{ label: 'Transactions', href: '/transactions' }}
        />
      </Card>
    );
  } else {
    body = (
      <ListTransition>
          <Card>
            {INBOX_SECTIONS.map(({ key }) => (
              <InboxSection
                key={key}
                sectionKey={key}
                items={items.filter((i) => i.section === key)}
              />
            ))}
          </Card>
      </ListTransition>
    );
  }

  return <div className="flex flex-col gap-space-8 desk:gap-space-16">{body}</div>;
}

interface InboxSectionProps {
  sectionKey: InboxSectionKey;
  items: InboxItemResponse[];
}

/** One section header with its count, then its rows; an empty section draws nothing. */
function InboxSection({ sectionKey, items }: InboxSectionProps) {
  if (items.length === 0) return null;
  return (
    <RowTransition>
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
          <RowTransition key={item.key}>
            {index > 0 ? <Divider /> : null}
            <InboxRow item={item} />
          </RowTransition>
        ))}
      </section>
    </RowTransition>
  );
}
