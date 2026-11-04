import React from 'react';

import { logoutToDinero } from '@/actions/auth';
import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import type { AppLockStatus } from '@/lib/api/types';
import type { UserResponse } from '@/lib/types';

import { DataCard, type SettingsDataValues } from './DataCard';
import { GeneralCard } from './GeneralCard';
import { HelpCard } from './HelpCard';
import { DeleteAccountCard } from './profile/DeleteAccountCard';
import { ProfileCard } from './profile/ProfileCard';
import { SecurityCard } from './SecurityCard';

/** The main Settings page: one column of cards, the section links inside them, then Sign out and Delete account. */
export function SettingsMain({
  user,
  appLock,
  values,
}: {
  user: UserResponse;
  appLock: AppLockStatus;
  values: SettingsDataValues;
}) {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <ProfileCard user={user} />
      <GeneralCard />
      <SecurityCard appLock={appLock} />
      <DataCard values={values} />
      <HelpCard />
      <Card>
        <form action={logoutToDinero}>
          <ListRow asChild title="Sign out">
            <button type="submit" />
          </ListRow>
        </form>
      </Card>
      <DeleteAccountCard user={user} />
    </div>
  );
}
