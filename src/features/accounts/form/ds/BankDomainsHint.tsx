'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { bankById } from '@/features/banks/banks';
import { loadBankDomains } from '@/features/data-sources/connections/gmailActions';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';

/** Under the Bank field of a new account whose bank is new to the user: which addresses its emails are read from. Hidden when the bank has no domains. */
export function BankDomainsHint({ bankId }: { bankId: string }) {
  const [open, setOpen] = React.useState(false);
  const { data } = useQuery({
    queryKey: keys.settings.gmailBankDomains(),
    queryFn: () => unwrapAction(loadBankDomains()),
    staleTime: 5 * 60_000,
  });
  const domains = data?.find((b) => b.bankId === bankId)?.domains ?? [];
  const bank = bankById(bankId);
  if (!bank || domains.length === 0) return null;

  return (
    <>
      {`We'll read ${bank.name}'s emails from its addresses. `}
      <Button variant="link" type="button" onClick={() => setOpen(true)}>
        See domains
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <Dialog.Content
          size="sm"
          title={`${bank.name} domains`}
          description="Mail from any address at these domains is read."
          secondary={{ label: 'Done', onSelect: () => setOpen(false) }}
        >
          <Dialog.Body>
            {domains.map((d) => (
              <ListRow key={d} flush title={d} />
            ))}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
