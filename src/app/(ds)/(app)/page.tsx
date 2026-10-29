import { redirect } from 'next/navigation';

import { appHref } from '@/features/shell/routes';

export default function Home() {
  redirect(appHref('/dashboard'));
}
