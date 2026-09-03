'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { TransactionLinkResponse } from '@/lib/transaction.types';

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
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/transaction-links', {
        params: { query: { transactionId } },
      });
      return (data ?? []) as TransactionLinkResponse[];
    },
    enabled: hasLinks,
  });

  const linksError = error ? (error instanceof ApiError ? error.response.message : (error as Error).message) : null;

  const fetchLinks = React.useCallback(async () => {
    await refetch();
  }, [refetch]);

  const unlinkMutation = useMutation({
    mutationFn: (linkId: string) => api.DELETE('/api/v1/transaction-links/{id}', { params: { path: { id: linkId } } }),
    onMutate: (linkId: string) => setUnlinkingId(linkId),
    onSuccess: () => {
      toast.success('Link removed successfully');
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      onCloseAndRefresh();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.response.message : 'Failed to unlink transaction');
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
