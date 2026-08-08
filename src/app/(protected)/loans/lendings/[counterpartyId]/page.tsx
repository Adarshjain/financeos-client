import { notFound } from 'next/navigation';

import { fetchCounterpartiesAction, fetchLendingsAction } from '@/actions/lendings';
import { CounterpartyDetail } from '@/app/(protected)/loans/lendings/[counterpartyId]/CounterpartyDetail';

interface PersonDetailPageProps {
  params: Promise<{ counterpartyId: string }>;
}

export async function generateMetadata({ params }: PersonDetailPageProps) {
  const { counterpartyId } = await params;
  const cpRes = await fetchCounterpartiesAction(0, 100);
  const cp = cpRes.success ? cpRes.data.content.find((c) => c.id === counterpartyId) : null;
  if (!cp) return { title: 'Person Not Found' };
  return {
    title: `${cp.name} - Lendings | FinanceOS`,
  };
}

export default async function PersonDetailPage({ params }: PersonDetailPageProps) {
  const { counterpartyId } = await params;

  const [cpRes, lendingsRes] = await Promise.all([
    fetchCounterpartiesAction(0, 100),
    fetchLendingsAction(counterpartyId, 0, 100),
  ]);

  const cp = cpRes.success ? cpRes.data.content.find((c) => c.id === counterpartyId) : null;
  if (!cp) {
    notFound();
  }

  const initialLendings = lendingsRes.success ? lendingsRes.data.content : [];

  return <CounterpartyDetail counterparty={cp} initialLendings={initialLendings} />;
}
