'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { JobsPanel } from '@/components/jobs/JobsPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { GmailAttentionCard } from './gmail/GmailAttentionCard';
import { GmailConnectionsCard } from './gmail/GmailConnectionsCard';
import { GmailSenderDialog } from './gmail/GmailSenderDialog';
import { GmailSendersCard } from './gmail/GmailSendersCard';
import { useGmailConnect } from './gmail/useGmailConnect';

export function GmailConnect() {
  const {
    loading,
    connections,
    senders,
    attentionData,
    attentionPage,
    setAttentionPage,
    message,
    isSyncing,
    isSenderDialogOpen,
    setIsSenderDialogOpen,
    editingSender,
    submittingSender,
    senderName,
    setSenderName,
    senderAddress,
    setSenderAddress,
    senderEnabled,
    setSenderEnabled,
    fetchAttention,
    handleConnect,
    handleDisconnect,
    handleSync,
    handleRetryAttentionItem,
    openAddSenderDialog,
    openEditSenderDialog,
    handleSenderSubmit,
    handleSenderDelete,
  } = useGmailConnect();

  return (
    <div className="space-y-2 pb-20">
      {/* Status Alerts */}
      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Needs Attention Card */}
      {attentionData && attentionData.content.length > 0 && (
        <GmailAttentionCard
          attentionData={attentionData}
          attentionPage={attentionPage}
          onPageChange={(page) => {
            setAttentionPage(page);
            fetchAttention(page);
          }}
          onRetry={handleRetryAttentionItem}
        />
      )}

      {/* Connection management */}
      <GmailConnectionsCard
        connections={connections}
        loading={loading}
        isSyncing={isSyncing}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onSync={handleSync}
      />

      {/* Jobs Panel */}
      <JobsPanel types={['GMAIL_SYNC']} title="Recent sync jobs" />

      {/* Senders Allowlist */}
      <GmailSendersCard
        senders={senders}
        onOpenAddSender={openAddSenderDialog}
        onOpenEditSender={openEditSenderDialog}
        onDeleteSender={handleSenderDelete}
      />

      {/* Add/Edit Sender Dialog */}
      <GmailSenderDialog
        open={isSenderDialogOpen}
        onOpenChange={setIsSenderDialogOpen}
        editingSender={editingSender}
        senderName={senderName}
        setSenderName={setSenderName}
        senderAddress={senderAddress}
        setSenderAddress={setSenderAddress}
        senderEnabled={senderEnabled}
        setSenderEnabled={setSenderEnabled}
        submittingSender={submittingSender}
        onSubmit={handleSenderSubmit}
      />
    </div>
  );
}
