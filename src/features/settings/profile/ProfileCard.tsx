import React from 'react';

import { logout } from '@/actions/auth';
import { Avatar, Button, Card, ListRow } from '@/components/ds';
import type { UserResponse } from '@/lib/types';

import { profileInitials, profileLines } from './profileModel';

/** Who is signed in, with Sign out. */
export function ProfileCard({ user }: { user: UserResponse }) {
  const { name, detail } = profileLines(user);
  return (
    <Card title="Profile" subtitle="From your Google account">
      <ListRow
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
          <form action={logout}>
            <Button type="submit" variant="secondary" size="sm">
              Sign out
            </Button>
          </form>
        }
      />
    </Card>
  );
}
