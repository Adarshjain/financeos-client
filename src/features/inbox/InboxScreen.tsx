'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { Banner } from '@/components/ds/Banner/Banner';
import { Card } from '@/components/ds/Card/Card';
import { Divider } from '@/components/ds/Divider/Divider';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { loadCorporateActionSuggestion, loadInstrumentRef } from '@/features/investments/corporate-actions/corporateActionActions';
import type { CorporateActionDialogProps } from '@/features/investments/corporate-actions/CorporateActionDialog';
import { loadCorporateActionDialog } from '@/features/investments/lazyDialogs';
import { LoadError } from '@/features/shell/LoadError';
import { UPCOMING_HREF } from '@/features/upcoming/upcomingTabs';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { InboxItemResponse } from '@/lib/api/types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import { useBill } from '@/lib/query/hooks/useBills';
import { useInbox } from '@/lib/query/hooks/useInbox';
import { keys } from '@/lib/query/keys';
import { ListTransition, RowTransition, useDeferredRows } from '@/lib/viewTransition';

import { loadNpsRecordTarget } from './inboxActions';
import type { PendingBillAction } from './inboxBillActions';
import { InboxBillHost } from './InboxBillHost';
import { INBOX_SECTIONS, type InboxSectionKey } from './inboxModel';
import { dsInboxNotifier } from './inboxNotifier';
import { InboxRow } from './InboxRow';
import { INBOX_SECTION_TITLES, type NpsRowAction, pendingFor, type RowButton, type RowMenuAction } from './inboxRowsModel';
import { InboxSkeleton } from './InboxSkeleton';
import { useInboxDeepLink } from './useInboxDeepLink';
import { useInboxMutations } from './useInboxMutations';

const SECTION_TONE = { act_now: 'danger', needs_look: 'warning', info: 'neutral' } as const;

export interface InboxScreenProps {
  /** ?item=<key> from a notification: scroll to that row and highlight it. */
  highlightKey?: string | null;
}

/** The Inbox tab: Act now and Needs a look in one card, plus the dialogs rows open. */
export function InboxScreen({ highlightKey = null }: InboxScreenProps) {
  const { data, isLoading, isFetching, error, refetch } = useInbox();
  const { snooze, dismiss, epfLink, epfDismiss, noStatement, npsPendingAction, npsPaymentAction, corporateActionRow } = useInboxMutations(dsInboxNotifier);
  const [pendingBill, setPendingBill] = React.useState<PendingBillAction | null>(null);
  const closeBill = React.useCallback(() => setPendingBill(null), []);
  // The bill loads after the press (shared with the host's query): the pressed button shows loading until its dialog can open.
  const bill = useBill(pendingBill?.statementId, pendingBill !== null);
  const billLoading = pendingBill && !bill.data && !bill.error ? pendingBill : null;

  // A corporate-action dialog opened from a row (never from the address): its instrument, kind, detected values and suggestion.
  const [caDialog, setCaDialog] = React.useState<Pick<CorporateActionDialogProps, 'instrument' | 'type' | 'prefill' | 'suggestionId'> | null>(null);
  const [caLoading, setCaLoading] = React.useState<string | null>(null);
  const { Component: CorporateActionDialog, run: runCaDialog } = useLazyDialog(loadCorporateActionDialog);

  const items = React.useMemo(() => data?.items ?? [], [data]);
  // Which account a debit is recorded to, and whether Tier II is open on it: read only when a Record row is shown.
  const hasRecordRow = items.some((i) => i.kind === 'nps_record');
  const { data: recordTarget, isLoading: recordTargetLoading } = useQuery({
    queryKey: [...keys.nps.all, 'recordTarget'],
    queryFn: () => unwrapAction(loadNpsRecordTarget()),
    enabled: hasRecordRow,
  });
  const rowOptions = React.useMemo(() => ({ npsTier2: recordTarget?.tier2 ?? false, npsTargetLoading: recordTargetLoading }), [recordTarget, recordTargetLoading]);
  const deepLink = useInboxDeepLink(highlightKey, data ? items : null);
  // Snooze and dismiss hide the row in the cache at once; the deferred rows let it fold away.
  const shownItems = useDeferredRows(items);

  const onNps = (item: InboxItemResponse, action: NpsRowAction) => {
    if (action === 'add_self' || action === 'add_child' || action === 'ignore') return npsPendingAction(item, action);
    return npsPaymentAction(item, action, recordTarget?.accountId);
  };

  const openCorporateAction = async (item: InboxItemResponse, button: RowButton) => {
    const loadingKey = `${item.key}|${button.id}`;
    setCaLoading(loadingKey);
    try {
      if (button.ca === 'review') {
        const suggestion = await unwrapAction(loadCorporateActionSuggestion(item.refs.suggestionId as string));
        const type = suggestion.kind === 'other' || suggestion.kind === 'oversold' ? undefined : suggestion.kind;
        await runCaDialog(() =>
          setCaDialog({
            instrument: suggestion.instrument,
            type,
            prefill: { exDate: suggestion.exDate, ratioFrom: suggestion.ratioFrom, ratioTo: suggestion.ratioTo },
            suggestionId: suggestion.id,
          }),
        );
      } else {
        const instrument = await unwrapAction(loadInstrumentRef(item.refs.instrumentId as string));
        await runCaDialog(() => setCaDialog({ instrument, type: button.ca === 'delisted' ? 'delisted' : 'merger' }));
      }
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't open this. Try again."), { tone: 'danger' });
    } finally {
      setCaLoading(null);
    }
  };

  const onBillButton = (item: InboxItemResponse, button: RowButton) => {
    if (button.ca === 'undo') return corporateActionRow(item, 'undo');
    if (button.ca === 'not_applicable') return corporateActionRow(item, 'dismiss');
    if (button.ca) return void openCorporateAction(item, button);
    if (button.epf === 'link') return epfLink(item);
    if (button.epf === 'dismiss') return epfDismiss(item);
    if (button.nps) return onNps(item, button.nps);
    const pending = pendingFor(item, button);
    if (pending) setPendingBill(pending);
  };

  const onMenuAction = (item: InboxItemResponse, action: RowMenuAction) => {
    if (action.nps) return onNps(item, action.nps);
    if (action.skip) noStatement(item.key, action.skip.accountId, action.skip.periodEnd);
  };

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
      <>
        <ListTransition>
          <Card>
            {INBOX_SECTIONS.map(({ key }) => (
              <InboxSection
                key={key}
                sectionKey={key}
                items={shownItems.filter((i) => i.section === key)}
                highlightKey={deepLink.found ? highlightKey : null}
                rowOptions={rowOptions}
                billLoading={billLoading}
                caLoading={caLoading}
                onBillButton={onBillButton}
                onMenuAction={onMenuAction}
                onSnooze={(item, until) => snooze(item.key, until)}
                onDismiss={(item) => (item.kind === 'epf_match' ? epfDismiss(item) : dismiss(item.key))}
              />
            ))}
          </Card>
        </ListTransition>
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
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {deepLink.missing ? <Banner tone="info">That item is already handled.</Banner> : null}
      {body}
      <InboxBillHost pending={pendingBill} onClose={closeBill} />
      {caDialog && CorporateActionDialog ? <CorporateActionDialog {...caDialog} onClose={() => setCaDialog(null)} /> : null}
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
            <InboxRow item={item} highlighted={item.key === highlightKey} {...handlers} />
          </RowTransition>
        ))}
      </section>
    </RowTransition>
  );
}
