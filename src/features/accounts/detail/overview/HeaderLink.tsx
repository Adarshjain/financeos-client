import Link from 'next/link';
import React from 'react';

import { Button, Icon, Text } from '@/components/ds';
import { OpenDialogButton } from '@/features/accounts/form/ds/OpenDialogButton';

/** A link in a card header: small link button in caption type, with a chevron when it opens another page. */
export function HeaderLink({
  href,
  chevron = false,
  children,
}: {
  href: string;
  chevron?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Text variant="label" as="span">
      <Button asChild variant="link" size="sm">
        <Link href={href}>
          {children}
          {chevron ? <Icon name="chevron-right" size="xs" /> : null}
        </Link>
      </Button>
    </Text>
  );
}

/** A header link that opens Edit account in place, looking like HeaderLink. */
export function HeaderDialogLink({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="label" as="span">
      <OpenDialogButton variant="link" size="sm">
        {children}
      </OpenDialogButton>
    </Text>
  );
}
