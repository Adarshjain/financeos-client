'use client';

import * as React from 'react';
import { toast } from 'sonner';

import {
  deleteTransactionLink,
  getTransactionLinks,
} from '@/actions/transaction-links';
import { TransactionLinkResponse } from '@/lib/transaction.types';

export function useTransactionLinks(
  transactionId: string,
  hasLinks: boolean,
  onCloseAndRefresh: () => void
) {
  const [links, setLinks] = React.useState<TransactionLinkResponse[]>([]);
  const [loadingLinks, setLoadingLinks] = React.useState(false);
  const [linksError, setLinksError] = React.useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [unlinkingId, setUnlinkingId] = React.useState<string | null>(null);

  const fetchLinks = React.useCallback(async () => {
    if (!hasLinks) {
      setLinks([]);
      return;
    }
    setLoadingLinks(true);
    setLinksError(null);
    try {
      const res = await getTransactionLinks(transactionId);
      if (res.success) {
        setLinks(res.data);
      } else {
        setLinksError(res.error.message);
      }
    } catch (error) {
      setLinksError((error as Error).message);
    } finally {
      setLoadingLinks(false);
    }
  }, [transactionId, hasLinks]);

  React.useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleUnlink = async (linkId: string) => {
    setUnlinkingId(linkId);
    try {
      const res = await deleteTransactionLink(linkId);
      if (res.success) {
        toast.success('Link removed successfully');
        fetchLinks();
        onCloseAndRefresh();
      } else {
        toast.error(res.error.message || 'Failed to unlink');
      }
    } catch {
      toast.error('Failed to unlink transaction');
    } finally {
      setUnlinkingId(null);
    }
  };

  return {
    links,
    loadingLinks,
    linksError,
    linkDialogOpen,
    setLinkDialogOpen,
    unlinkingId,
    fetchLinks,
    handleUnlink,
  };
}
