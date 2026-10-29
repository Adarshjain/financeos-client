'use client';

import React from 'react';

import { ActionBar, Button, Hero, type HeroFigure } from '@/components/ds';
import { OpenDialogButton } from '@/features/accounts/form/ds/OpenDialogButton';
import { MarkPaidDialog } from '@/features/bills/MarkPaidDialog';

import type { HeaderModel } from './headerModel';

/** The block at the top of every account page: the hero with the headline figure, then the action bar with one fact. */
export function AccountHeaderCard({
  accountName,
  model,
  figures,
}: {
  accountName: string;
  model: HeaderModel;
  /** Up to three small figures under the headline. */
  figures?: HeroFigure[];
}) {
  const [markPaidOpen, setMarkPaidOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <Hero label={model.label} value={model.figure} valueTone={model.figureTone} figures={figures} />
      <ActionBar
        info={model.info}
        actions={
          <>
            {model.markPaid ? (
              <Button variant="secondary" onClick={() => setMarkPaidOpen(true)}>
                Mark paid
              </Button>
            ) : null}
            <OpenDialogButton variant="secondary">Edit</OpenDialogButton>
          </>
        }
      />
      {model.markPaid ? (
        <MarkPaidDialog
          open={markPaidOpen}
          onOpenChange={setMarkPaidOpen}
          statementId={model.markPaid.statementId}
          cardName={accountName}
          remaining={model.markPaid.remaining}
        />
      ) : null}
    </div>
  );
}
