'use server';

import { serverApi } from '@/lib/api/server';
import { authApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';

export interface HelloInput {
  displayName?: string;
  birthDate?: string;
  /** false saves step 1 but keeps onboarding open (the two-step flow). Absent = finish. */
  finish?: boolean;
}

// No revalidatePath: the screen stays on /welcome for the Connect Gmail step.
export const submitHello = createDomainAction(
  { fallbackError: "Couldn't save that. Try again." },
  async (input: HelloInput) => {
    await authApi.hello({ ...input, termsAccepted: true });
  },
);

/** Skip on the Connect Gmail step: onboarding is done. */
export const finishHello = createDomainAction(
  { fallbackError: "Couldn't finish. Try again." },
  async () => {
    await authApi.finishHello();
  },
);

/** Connect Gmail from Hello: the server sends the browser back to Home instead of Settings. */
export const startGmailOAuthToHome = createDomainAction(
  { fallbackError: "Couldn't connect Gmail. Try again." },
  async () =>
    (await serverApi.GET('/api/v1/gmail/oauth/start', { params: { query: { returnTo: 'home' } } })).data ?? null,
);
