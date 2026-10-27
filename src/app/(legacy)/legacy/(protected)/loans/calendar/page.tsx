import { redirect } from 'next/navigation';

import { legacyHref } from '@/features/shell/routes';

export default function ObligationsCalendarPage() {
  redirect(legacyHref('/upcoming'));
}
