import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { CounterpartyDetail } from '@/app/(protected)/loans/lendings/[counterpartyId]/CounterpartyDetail';
import { counterpartiesApi, lendingsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';
import type { CounterpartyResponse } from '@/lib/types';

const COUNTERPARTIES_PAGE_SIZE = 100;
const LENDINGS_PAGE_SIZE = 200;

interface PersonDetailPageProps {
  params: Promise<{ counterpartyId: string }>;
}

function findCounterparty(
  page: { content: CounterpartyResponse[] },
  counterpartyId: string
): CounterpartyResponse | undefined {
  return page.content.find((c) => c.id === counterpartyId);
}

export async function generateMetadata({ params }: PersonDetailPageProps) {
  const { counterpartyId } = await params;
  const cpPage = await counterpartiesApi.list(0, COUNTERPARTIES_PAGE_SIZE);
  const cp = findCounterparty(cpPage, counterpartyId);
  if (!cp) return { title: 'Person Not Found' };
  return { title: `${cp.name} - Lendings | FinanceOS` };
}

export default async function PersonDetailPage({
  params,
}: PersonDetailPageProps) {
  const { counterpartyId } = await params;

  const [cpPage, lendingsPage] = await Promise.all([
    counterpartiesApi.list(0, COUNTERPARTIES_PAGE_SIZE),
    lendingsApi.list(counterpartyId, 0, LENDINGS_PAGE_SIZE),
  ]);

  const cp = findCounterparty(cpPage, counterpartyId);
  if (!cp) {
    notFound();
  }

  const qc = getQueryClient();
  qc.setQueryData(
    keys.lendings.counterparties({ page: 0, size: COUNTERPARTIES_PAGE_SIZE }),
    cpPage
  );
  qc.setQueryData(
    keys.lendings.list({
      counterpartyId,
      page: 0,
      size: LENDINGS_PAGE_SIZE,
    }),
    lendingsPage
  );

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <CounterpartyDetail counterpartyId={counterpartyId} />
    </HydrationBoundary>
  );
}
