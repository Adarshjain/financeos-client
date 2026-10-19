import Link from 'next/link';
import React from 'react';

import { Button, Icon, Text } from '@/components/ds';

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
          {chevron ? <Icon name="chevron-right" size="sm" /> : null}
        </Link>
      </Button>
    </Text>
  );
}
