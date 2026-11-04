import React from 'react';

import { Avatar } from '@/components/ds/Avatar/Avatar';
import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { todayInAppZone } from '@/lib/date-range';
import type { UserResponse } from '@/lib/types';

import { ProfileEditRows } from './ProfileEditRows';
import { profileInitials, profileLines } from './profileModel';

/** Who is signed in, with the name and birth date rows (tap to edit). */
export function ProfileCard({ user }: { user: UserResponse }) {
  const { name, detail } = profileLines(user);
  return (
    <Card title="Profile" subtitle="Used to open your password-protected statements">
      <ListRow
        wrap
        leading={
          <Avatar
            variant="circle"
            size="lg"
            src={user.pictureUrl ?? undefined}
            alt={name}
            initials={profileInitials(name)}
          />
        }
        title={name}
        subtitle={detail}
      />
      <ProfileEditRows user={user} today={todayInAppZone()} />
    </Card>
  );
}
