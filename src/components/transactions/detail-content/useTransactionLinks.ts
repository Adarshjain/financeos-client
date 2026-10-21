'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';

import { deleteTransactionLink, fetchTransactionLinks } from '@/features/transactions/detail/transactionDetailApi';
import { ApiError } from '@/lib/api/client';
import { invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

export function useTransactionLinks(
  transactionId: string,
  hasLinks: boolean,
  onCloseAndRefresh: () => void
) {
  const queryClient = useQueryClient();
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [unlinkingId, setUnlinkingId] = React.useState<string | null>(null);

  const {
    data: links = [],
    isLoading: loadingLinks,
    error,
    refetch,
  } = useQuery({
    queryKey: keys.transactions.links(transactionId),
    queryFn: () => fetchTransactionLinks(transactionId),
    enabled: hasLinks,
  });

  const linksError = error ? (error instanceof ApiError ? error.response.message : (error as Error).message) : null;

  const fetchLinks = React.useCallback(async () => {
    await refetch();
  }, [refetch]);

  const unlinkMutation = useMutation({
    mutationFn: (linkId: string) => deleteTransactionLink(linkId),
    onMutate: (linkId: string) => setUnlinkingId(linkId),
    onSuccess: () => {
      toast.success('Link removed successfully');
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      void invalidateMoneyQueries(queryClient);
      onCloseAndRefresh();
    },
    onError: (err: unknown) => {
      toastError(err, 'Failed to unlink transaction');
    },
    onSettled: () => setUnlinkingId(null),
  });

  const handleUnlink = async (linkId: string) => {
    await unlinkMutation.mutateAsync(linkId).catch(() => {
      // Error toast already shown by the mutation's onError handler.
    });
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
