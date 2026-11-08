'use server';

import { authApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';

export const updateProfile = action('editProfile.updateProfile', createDomainAction(
  { fallbackError: "Couldn't save your profile. Try again.", revalidatePaths: ['/settings'] },
  async (input: { displayName: string; birthDate?: string }) => {
    await authApi.updateProfile(input);
  },
));
