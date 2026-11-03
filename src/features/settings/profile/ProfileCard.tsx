import React from 'react';

import { logoutToDinero } from '@/actions/auth';
import { Avatar } from '@/components/ds/Avatar/Avatar';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Conceal } from '@/components/ds/Conceal/Conceal';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';
import { formatBirthDate } from '@/features/onboarding/birthDate';
import { todayInAppZone } from '@/lib/date-range';
import type { UserResponse } from '@/lib/types';

import { EditProfile } from './EditProfile';
import { profileInitials, profileLines } from './profileModel';

/** Who is signed in, with Edit (name, birth date) and Sign out. */
export function ProfileCard({ user }: { user: UserResponse }) {
  const { name, detail } = profileLines(user);
  return (
    <Card title="Profile" subtitle="From your Google account" action={<EditProfile user={user} today={todayInAppZone()} />}>
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
        trailing={
          <form action={logoutToDinero}>
            <Button type="submit" variant="secondary" size="sm">
              Sign out
            </Button>
          </form>
        }
      />
      <ListRow
        title="Date of birth"
        trailing={
          <Text variant="body" tone="ink-2">
            <Conceal whole placeholder="••/••/••••">
              {formatBirthDate(user.birthDate) || 'Not set'}
            </Conceal>
          </Text>
        }
      />
    </Card>
  );
}
