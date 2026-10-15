import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import {
  ConfirmDialogShell,
  Dialog,
  DialogBody,
  DialogContent,
  DialogShell,
  DialogTrigger,
} from './Dialog';

const meta: Meta<typeof DialogShell> = {
  title: 'DS/Overlays/Dialog',
  component: DialogShell,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Modal width on desktop',
    },
    variant: {
      control: 'select',
      options: ['modal', 'side-panel'],
      description: 'Centred modal vs desktop side panel (both render as sheet on phone)',
    },
    showClose: {
      control: 'boolean',
    },
    title: {
      control: 'text',
    },
    description: {
      control: 'text',
    },
  },
  args: {
    size: 'md',
    variant: 'modal',
    title: 'Approve 9 transactions',
    description: 'Clears the reasons you tick. Rows that need no approval are skipped.',
    showClose: true,
  },
};

export default meta;
type Story = StoryObj<typeof DialogShell>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="flex flex-col gap-space-32 max-w-5xl">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Desktop · sm · with tertiary
        </div>
        <DialogShell
          size="sm"
          title="Approve 9 transactions"
          description="Clears the reasons you tick."
          onClose={() => {}}
          tertiary={
            <Button size="sm" variant="danger">
              Delete 9
            </Button>
          }
          secondary={
            <Button size="sm" variant="secondary">
              Cancel
            </Button>
          }
          primary={
            <Button size="sm" variant="primary">
              Approve 9
            </Button>
          }
        >
          <DialogBody>
            <label className="flex items-center justify-between py-space-6 border-b border-line-soft cursor-pointer">
              <span className="text-body font-semibold text-ink">
                Unreconciled · 6
              </span>
              <Checkbox checked disabled />
            </label>
            <label className="flex items-center justify-between py-space-6 cursor-pointer">
              <span className="text-body font-semibold text-ink">
                Duplicate · 3
              </span>
              <Checkbox checked disabled />
            </label>
          </DialogBody>
        </DialogShell>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Phone sheet · same footer, tertiary left
        </div>
        <div className="bg-scrim p-space-16 max-w-sm rounded-ds-lg">
          <DialogShell
            size="sm"
            title="Edit rule"
            description="Swiggy · Food & dining"
            onClose={() => {}}
            tertiary={
              <Button variant="danger">
                Delete rule
              </Button>
            }
            secondary={
              <Button variant="secondary">
                Cancel
              </Button>
            }
            primary={
              <Button variant="primary">
                Save
              </Button>
            }
          >
            <DialogBody>
              <div>
                <label className="block text-label font-bold text-ink-2 mb-space-4">
                  Pattern
                </label>
                <div className="border border-line rounded-ds-md px-space-12 py-space-8 text-body text-ink font-semibold">
                  SWIGGY
                </div>
              </div>
            </DialogBody>
          </DialogShell>
        </div>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          ConfirmDialog (preview + gentler alternative)
        </div>
        <ConfirmDialogShell
          title="Delete statement"
          description="Removes the Oct 2026 statement and what it added to this account."
          impact={[
            '6 transactions it created will be deleted.',
            '2 email alerts go back to review as unreconciled.',
          ]}
          confirmLabel="Delete statement"
          cancelLabel="Cancel"
          alternativeLabel="Close instead"
        />
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Side panel (desktop detail)
        </div>
        <DialogShell
          variant="side-panel"
          size="sm"
          title="Swiggy Bangalore"
          description="₹1,249 · 14 Oct 2026"
          onClose={() => {}}
          secondary={
            <Button size="sm" variant="secondary">
              Cancel
            </Button>
          }
          primary={
            <Button size="sm" variant="primary">
              Save
            </Button>
          }
        >
          <DialogBody>
            <div className="text-body text-ink">
              Transaction details and categorization rules.
            </div>
          </DialogBody>
        </DialogShell>
      </div>
    </div>
  ),
};

export const DesktopSm: Story = {
  name: 'Desktop · sm · with tertiary',
  args: {
    size: 'sm',
    title: 'Approve 9 transactions',
    description: 'Clears the reasons you tick.',
  },
  render: (args) => (
    <DialogShell
      {...args}
      tertiary={
        <Button size="sm" variant="danger">
          Delete 9
        </Button>
      }
      secondary={
        <Button size="sm" variant="secondary">
          Cancel
        </Button>
      }
      primary={
        <Button size="sm" variant="primary">
          Approve 9
        </Button>
      }
    >
      <DialogBody>
        <label className="flex items-center justify-between py-space-6 border-b border-line-soft cursor-pointer">
          <span className="text-body font-semibold text-ink">
            Unreconciled · 6
          </span>
          <Checkbox checked disabled />
        </label>
        <label className="flex items-center justify-between py-space-6 cursor-pointer">
          <span className="text-body font-semibold text-ink">
            Duplicate · 3
          </span>
          <Checkbox checked disabled />
        </label>
      </DialogBody>
    </DialogShell>
  ),
};

export const DesktopMd: Story = {
  name: 'Desktop · md',
  args: {
    size: 'md',
    title: 'Edit account',
    description: 'Update balance and credentials',
  },
  render: (args) => (
    <DialogShell
      {...args}
      secondary={
        <Button size="sm" variant="secondary">
          Cancel
        </Button>
      }
      primary={
        <Button size="sm" variant="primary">
          Save changes
        </Button>
      }
    >
      <DialogBody>
        <div className="text-body text-ink-3">Account configuration form</div>
      </DialogBody>
    </DialogShell>
  ),
};

export const DesktopLg: Story = {
  name: 'Desktop · lg',
  args: {
    size: 'lg',
    title: 'Matching transactions · Dunzo',
    description: 'Manually reviewed transactions are left out',
  },
  render: (args) => (
    <DialogShell
      {...args}
      secondary={
        <Button size="sm" variant="secondary">
          Cancel
        </Button>
      }
      primary={
        <Button size="sm" variant="primary">
          Apply rule (11)
        </Button>
      }
    >
      <DialogBody>
        <div className="flex items-center justify-between py-space-6 border-b border-line-soft text-body">
          <span className="text-ink">DUNZO DAILY BANGALORE</span>
          <span className="text-caption text-ink-3 tabular-nums">₹612</span>
        </div>
        <div className="flex items-center justify-between py-space-6 text-body">
          <span className="text-ink">DUNZO DAILY</span>
          <span className="text-caption text-ink-3 tabular-nums">₹390</span>
        </div>
      </DialogBody>
    </DialogShell>
  ),
};

export const DesktopXl: Story = {
  name: 'Desktop · xl',
  args: {
    size: 'xl',
    title: 'Review import batch',
    description: '142 transactions parsed from HDFC statement',
  },
  render: (args) => (
    <DialogShell
      {...args}
      secondary={
        <Button size="sm" variant="secondary">
          Cancel
        </Button>
      }
      primary={
        <Button size="sm" variant="primary">
          Import all
        </Button>
      }
    >
      <DialogBody>
        <div className="text-body text-ink-3">Statement transactions table</div>
      </DialogBody>
    </DialogShell>
  ),
};

export const PhoneSheet: Story = {
  name: 'Phone sheet',
  parameters: {
    viewport: { defaultViewport: 'phone' },
  },
  args: {
    size: 'sm',
    title: 'Edit rule',
    description: 'Swiggy · Food & dining',
  },
  render: (args) => (
    <div className="bg-scrim p-space-16 max-w-sm rounded-ds-lg">
      <DialogShell
        {...args}
        tertiary={
          <Button variant="danger">
            Delete rule
          </Button>
        }
        secondary={
          <Button variant="secondary">
            Cancel
          </Button>
        }
        primary={
          <Button variant="primary">
            Save
          </Button>
        }
      >
        <DialogBody>
          <div>
            <label className="block text-label font-bold text-ink-2 mb-space-4">
              Pattern
            </label>
            <div className="border border-line rounded-ds-md px-space-12 py-space-8 text-body text-ink font-semibold">
              SWIGGY
            </div>
          </div>
        </DialogBody>
      </DialogShell>
    </div>
  ),
};

export const SidePanel: Story = {
  name: 'Side panel',
  args: {
    variant: 'side-panel',
    size: 'sm',
    title: 'Transaction detail',
    description: 'Swiggy Bangalore · ₹1,249',
  },
  render: (args) => (
    <DialogShell
      {...args}
      secondary={
        <Button size="sm" variant="secondary">
          Cancel
        </Button>
      }
      primary={
        <Button size="sm" variant="primary">
          Save
        </Button>
      }
    >
      <DialogBody>
        <div className="text-body text-ink">
          Detail view sliding in from the right on desktop, sheet on phone.
        </div>
      </DialogBody>
    </DialogShell>
  ),
};

export const ConfirmDialogWithPreview: StoryObj<typeof ConfirmDialogShell> = {
  name: 'ConfirmDialog · with preview',
  render: () => (
    <ConfirmDialogShell
      title="Delete statement"
      description="Removes the Oct 2026 statement and what it added to this account."
      impact={[
        '6 transactions it created will be deleted.',
        '2 email alerts go back to review as unreconciled.',
      ]}
      confirmLabel="Delete statement"
      cancelLabel="Cancel"
    />
  ),
};

export const ConfirmDialogWithGentlerOption: StoryObj<
  typeof ConfirmDialogShell
> = {
  name: 'ConfirmDialog · gentler option',
  render: () => (
    <ConfirmDialogShell
      title="Discard changes?"
      description="You have unsaved changes in this rule."
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      alternativeLabel="Close instead"
    />
  ),
};

export const ConfirmDialogLoading: StoryObj<typeof ConfirmDialogShell> = {
  name: 'ConfirmDialog · loading preview',
  render: () => (
    <ConfirmDialogShell
      title="Delete account"
      description="Checking what will be affected…"
      isCheckingImpact
      checkingMessage="Checking transactions and rules…"
      confirmLabel="Delete account"
      cancelLabel="Cancel"
    />
  ),
};

const InteractiveModalDemo: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent
        size="sm"
        title="Approve 9 transactions"
        description="Clears the reasons you tick."
        secondary={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        }
        primary={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setOpen(false)}
          >
            Approve 9
          </Button>
        }
      >
        <DialogBody>
          <div className="text-body text-ink">
            Are you sure you want to approve these items?
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export const InteractiveModal: Story = {
  name: 'Interactive modal',
  render: () => <InteractiveModalDemo />,
};
