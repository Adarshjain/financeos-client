import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Button } from '../Button/Button';
import { ConfirmSheet, ConfirmSheetShell } from './ConfirmSheet';

const meta: Meta<typeof ConfirmSheetShell> = {
  title: 'DS/Overlays/ConfirmSheet',
  component: ConfirmSheetShell,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmSheetShell>;

export const DeleteStatement: Story = {
  name: 'DeleteStatement',
  render: () => (
    <div className="max-w-md bg-scrim p-space-16 rounded-ds-lg">
      <ConfirmSheetShell
        title="Delete statement"
        description="Removes the Oct 2026 statement and what it added to this account."
        impact={[
          <>
            <strong className="font-semibold text-ink">6 transactions</strong>{' '}
            it created will be deleted.
          </>,
          '2 email alerts go back to review as unreconciled.',
        ]}
        cancelLabel="Cancel"
        confirmLabel="Delete statement"
      />
    </div>
  ),
};

export const DiscardEdits: Story = {
  name: 'DiscardEdits',
  render: () => (
    <div className="max-w-md bg-scrim p-space-16 rounded-ds-lg">
      <ConfirmSheetShell
        title="Discard unsaved changes?"
        description="You have unsaved changes to 'Swiggy & Zomato Rule'. If you leave now, these edits will be lost."
        cancelLabel="Keep editing"
        confirmLabel="Discard"
      />
    </div>
  ),
};

export const WithAlternative: Story = {
  name: 'WithAlternative',
  render: () => (
    <div className="max-w-md bg-scrim p-space-16 rounded-ds-lg">
      <ConfirmSheetShell
        title="Delete HDFC Regalia?"
        description="Deleting an account permanently wipes all linked transaction history, statements, and category trends."
        alternativeLabel="Close instead"
        cancelLabel="Cancel"
        confirmLabel="Delete account"
        impact={[
          '48 past statements will be archived.',
          '₹ 1,42,850 in historical spending will be unlinked.',
        ]}
      />
    </div>
  ),
};

export const LoadingPreview: Story = {
  name: 'LoadingPreview',
  render: () => (
    <div className="max-w-md bg-scrim p-space-16 rounded-ds-lg">
      <ConfirmSheetShell
        title="Delete Swiggy Bangalore · ₹1,249?"
        description="Calculating recurring subscription impact and linked split entries…"
        isCheckingImpact
        checkingMessage="Checking what will be affected…"
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  ),
};

const InteractiveConfirmSheetStory: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-space-24">
      <Button variant="danger-outline" onClick={() => setOpen(true)}>
        Delete transaction (₹1,249)
      </Button>
      <ConfirmSheet
        open={open}
        onOpenChange={setOpen}
        title="Delete Swiggy Bangalore · ₹1,249?"
        description="This transaction will be permanently removed from your HDFC Millennia account."
        impact={[
          'Linked receipt snapshot will be unattached.',
          'Monthly dining category total will reduce by ₹ 1,249.',
        ]}
        confirmLabel="Delete transaction"
        cancelLabel="Cancel"
        onConfirm={() => setOpen(false)}
      />
    </div>
  );
};

export const Interactive: Story = {
  name: 'Interactive',
  render: () => <InteractiveConfirmSheetStory />,
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-24 max-w-xl">
      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Delete Statement
        </h4>
        <div className="bg-scrim p-space-12 rounded-ds-lg">
          <ConfirmSheetShell
            title="Delete statement"
            description="Removes the Oct 2026 statement and what it added to this account."
            impact={[
              '6 transactions it created will be deleted.',
              '2 email alerts go back to review as unreconciled.',
            ]}
            cancelLabel="Cancel"
            confirmLabel="Delete statement"
          />
        </div>
      </div>

      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Discard Edits
        </h4>
        <div className="bg-scrim p-space-12 rounded-ds-lg">
          <ConfirmSheetShell
            title="Discard unsaved changes?"
            description="You have unsaved changes to this rule. Leaving now will lose them."
            cancelLabel="Keep editing"
            confirmLabel="Discard"
          />
        </div>
      </div>

      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          With Gentler Alternative
        </h4>
        <div className="bg-scrim p-space-12 rounded-ds-lg">
          <ConfirmSheetShell
            title="Delete HDFC Regalia?"
            description="Wipes linked transaction history and statements."
            alternativeLabel="Close instead"
            cancelLabel="Cancel"
            confirmLabel="Delete account"
          />
        </div>
      </div>

      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Loading Preview
        </h4>
        <div className="bg-scrim p-space-12 rounded-ds-lg">
          <ConfirmSheetShell
            title="Delete Swiggy Bangalore · ₹1,249?"
            description="Calculating dependencies…"
            isCheckingImpact
            confirmLabel="Delete"
            cancelLabel="Cancel"
          />
        </div>
      </div>
    </div>
  ),
};
