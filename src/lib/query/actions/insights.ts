'use server';

import type { components } from '@/lib/api/schema';
import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';

export const loadEmergencyFund = createDomainAction(
  { fallbackError: "Couldn't load the emergency fund. Try again." },
  async (): Promise<components['schemas']['EmergencyFundResponse']> => {
    const { data } = await serverApi.GET('/api/v1/insights/emergency-fund');
    return data as components['schemas']['EmergencyFundResponse'];
  },
);
