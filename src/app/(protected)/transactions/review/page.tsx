import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { parseReviewSearchParams } from '@/components/transactions/review-browser/reviewDeepLink';
import { ReviewBrowser } from '@/components/transactions/ReviewBrowser';
import { accountsApi, categoriesApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export default async function TransactionReviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialFilters = parseReviewSearchParams(await searchParams);
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: keys.accounts.list(), queryFn: () => accountsApi.list() }),
    queryClient.prefetchQuery({ queryKey: keys.categories.list(), queryFn: () => categoriesApi.list() }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReviewBrowser initialFilters={initialFilters} />
    </HydrationBoundary>
  );
}
