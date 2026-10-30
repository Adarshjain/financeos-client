'use client';

import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { GRID_GAP } from '@/components/ds/gridGap';

import { AttentionCard } from './AttentionCard';
import { OAUTH_ERROR_FALLBACK, type OauthReturn, shortError } from './connectionsModel';
import { MailboxesCard } from './MailboxesCard';
import { RecentSyncJobsCard } from './RecentSyncJobsCard';
import { SenderDialog } from './SenderDialog';
import { SendersCard } from './SendersCard';
import { useGmailConnect } from './useGmailConnect';
import { useOauthReturn } from './useOauthReturn';

/** Settings → Connections: mailboxes, what needs attention, allowed senders, and the live sync jobs. */
export function ConnectionsScreen({
  oauth,
  focusAttention = false,
}: {
  oauth: OauthReturn | null;
  focusAttention?: boolean;
}) {
  const g = useGmailConnect();
  const { banner, dismiss } = useOauthReturn(oauth);

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {banner?.kind === 'success' ? (
        <Banner tone="success" title="Gmail connected" onDismiss={dismiss}>
          Your Gmail account <strong>{banner.email}</strong> is connected. Transaction alerts and statements from
          this account are now processed.
        </Banner>
      ) : null}
      {banner?.kind === 'error' ? (
        <Banner tone="danger" title="Connection error" onDismiss={dismiss}>
          {shortError(banner.message, OAUTH_ERROR_FALLBACK)}
        </Banner>
      ) : null}
      {g.message ? (
        <Banner tone={g.message.type === 'success' ? 'success' : 'danger'} onDismiss={g.dismissMessage}>
          {g.message.type === 'success' ? g.message.text : shortError(g.message.text, 'Something went wrong. Try again.')}
        </Banner>
      ) : null}

      <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
        <div className="desk:col-span-7 flex flex-col gap-space-8 desk:gap-space-16">
          <MailboxesCard
            connections={g.connections}
            loading={g.loading}
            isSyncing={g.isSyncing}
            onConnect={g.handleConnect}
            onSync={g.handleSync}
            onDisconnect={g.handleDisconnect}
          />
          {g.attentionData ? (
            <AttentionCard
              attentionData={g.attentionData}
              attentionPage={g.attentionPage}
              onPageChange={g.setAttentionPage}
              archivedData={g.archivedData}
              archivedPage={g.archivedPage}
              onArchivedPageChange={g.setArchivedPage}
              retryItem={g.handleRetryAttentionItem}
              onArchive={g.handleArchiveAttentionItem}
              onUnarchive={g.handleUnarchiveAttentionItem}
              autoScroll={focusAttention}
            />
          ) : null}
          <SendersCard
            senders={g.senders}
            onOpenAddSender={g.openAddSenderDialog}
            onOpenEditSender={g.openEditSenderDialog}
          />
        </div>
        <div className="desk:col-span-5">
          <RecentSyncJobsCard />
        </div>
      </div>

      <SenderDialog
        open={g.isSenderDialogOpen}
        onOpenChange={g.setIsSenderDialogOpen}
        editingSender={g.editingSender}
        senderName={g.senderName}
        setSenderName={g.setSenderName}
        senderAddress={g.senderAddress}
        setSenderAddress={g.setSenderAddress}
        senderEnabled={g.senderEnabled}
        setSenderEnabled={g.setSenderEnabled}
        submittingSender={g.submittingSender}
        onSubmit={g.handleSenderSubmit}
        onDelete={g.handleSenderDelete}
      />
    </div>
  );
}
