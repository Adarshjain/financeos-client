import { fetchUpcomingObligationsAction } from '@/actions/lendings';
import { CalendarView } from '@/app/(protected)/loans/calendar/CalendarView';

export const metadata = {
  title: 'Obligations Calendar | FinanceOS',
  description: 'Upcoming loan EMIs and P2P lending expected returns calendar.',
};

export default async function ObligationsCalendarPage() {
  const res = await fetchUpcomingObligationsAction(3);

  const initialObligations = res.success
    ? res.data
    : {
        items: [],
      };

  return <CalendarView initialObligations={initialObligations} />;
}
