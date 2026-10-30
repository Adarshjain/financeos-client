import React from 'react';

import { logoutToDinero } from '@/actions/auth';
import { Avatar } from '@/components/ds/Avatar/Avatar';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import type { UserResponse } from '@/lib/types';

import { profileInitials, profileLines } from './profileModel';

/** Who is signed in, with Sign out. */
export function ProfileCard({ user }: { user: UserResponse }) {
  const { name, detail } = profileLines(user);
  return (
    <Card title="Profile" subtitle="From your Google account">
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
    </Card>
  );
}
