import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../Button/Button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogShell,
  DialogTrigger,
} from './Dialog';

const meta: Meta<typeof DialogShell> = {
  title: 'DS/Overlays/Dialog',
  component: DialogShell,
  parameters: {
    layout: 'padded',
  },
  args: {
    title: 'Approve 9 transactions',
    description:
      'Clears the reasons you tick. Rows that need no approval are skipped.',
  },
};

export default meta;
type Story = StoryObj<typeof DialogShell>;

export const SmallForm: Story = {
  name: 'Small (440)',
  render: () => (
    <DialogShell
      size="sm"
      title="Approve 9 transactions"
      description="Clears the reasons you tick. Rows that need no approval are skipped."
      onClose={() => alert('Close')}
    >
      <DialogBody>
        <label className="flex items-center justify-between py-space-6 border-b border-line-soft cursor-pointer">
          <span className="text-body font-semibold text-ink">Unreconciled · 6</span>
          <input
            type="checkbox"
            defaultChecked
            className="w-space-16 h-space-16 accent-brand rounded-ds-xs cursor-pointer"
          />
        </label>
        <label className="flex items-center justify-between py-space-6 cursor-pointer">
          <span className="text-body font-semibold text-ink">Duplicate · 3</span>
          <input
            type="checkbox"
            defaultChecked
            className="w-space-16 h-space-16 accent-brand rounded-ds-xs cursor-pointer"
          />
        </label>
      </DialogBody>
      <DialogFooter
        leftAction={
          <Button size="sm" variant="danger">
            Delete 9
          </Button>
        }
        secondaryAction={
          <Button size="sm" variant="secondary">
            Cancel
          </Button>
        }
        primaryAction={
          <Button size="sm" variant="primary">
            Approve 9
          </Button>
        }
      />
    </DialogShell>
  ),
};

export const LargeList: Story = {
  name: 'Large (760)',
  render: () => (
    <DialogShell
      size="lg"
      title="Matching transactions · Dunzo"
      description="Manually reviewed transactions are left out"
      onClose={() => alert('Close')}
    >
      <DialogBody>
        <div className="flex items-center gap-space-8 py-space-6 border-b border-line-soft font-bold text-body text-ink">
          <span className="text-brand">✓</span>
          <span>Select all 12 matches</span>
        </div>
        <div className="flex items-center justify-between py-space-6 border-b border-line-soft text-body">
          <div className="flex items-center gap-space-8">
            <span className="text-brand">✓</span>
            <span className="text-ink">DUNZO DAILY BANGALORE</span>
          </div>
          <span className="text-caption text-ink-3 tabular-nums">₹612</span>
        </div>
        <div className="flex items-center justify-between py-space-6 text-body">
          <div className="flex items-center gap-space-8">
            <span className="text-ink-4">○</span>
            <span className="text-ink">DUNZO DAILY</span>
          </div>
          <span className="text-caption text-ink-3 tabular-nums">₹390</span>
        </div>
      </DialogBody>
      <DialogFooter
        secondaryAction={
          <Button size="sm" variant="secondary">
            Cancel
          </Button>
        }
        primaryAction={
          <Button size="sm" variant="primary">
            Apply rule (11)
          </Button>
        }
      />
    </DialogShell>
  ),
};

export const DefaultDialog: Story = {
  name: 'Default (640)',
  render: () => (
    <DialogShell
      size="md"
      title="Edit account"
      description="Update balance and credentials"
      onClose={() => {}}
    >
      <DialogBody>
        <div className="text-body text-ink-3">Account form fields</div>
      </DialogBody>
      <DialogFooter
        secondaryAction={
          <Button size="sm" variant="secondary">
            Cancel
          </Button>
        }
        primaryAction={
          <Button size="sm" variant="primary">
            Save changes
          </Button>
        }
      />
    </DialogShell>
  ),
};

export const ExtraLarge: Story = {
  name: 'Extra large (920)',
  render: () => (
    <DialogShell
      size="xl"
      title="Review import batch"
      description="142 transactions parsed from HDFC statement"
      onClose={() => {}}
    >
      <DialogBody>
        <div className="text-body text-ink-3">Table of transactions</div>
      </DialogBody>
      <DialogFooter
        secondaryAction={
          <Button size="sm" variant="secondary">
            Cancel
          </Button>
        }
        primaryAction={
          <Button size="sm" variant="primary">
            Import all
          </Button>
        }
      />
    </DialogShell>
  ),
};

export const InteractiveModal: Story = {
  name: 'Interactive modal',
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent
        size="sm"
        title="Approve 9 transactions"
        description="Clears the reasons you tick."
      >
        <DialogBody>
          <div className="text-body text-ink">
            Are you sure you want to approve these items?
          </div>
        </DialogBody>
        <DialogFooter
          secondaryAction={
            <Button size="sm" variant="secondary">
              Cancel
            </Button>
          }
          primaryAction={
            <Button size="sm" variant="primary">
              Approve
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  ),
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="flex flex-col gap-space-32 max-w-5xl">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Small (440)
        </div>
        <DialogShell
          size="sm"
          title="Approve 9 transactions"
          description="Clears the reasons you tick."
          onClose={() => {}}
        >
          <DialogBody>
            <div className="text-body">Body content</div>
          </DialogBody>
          <DialogFooter
            leftAction={
              <Button size="sm" variant="danger">
                Delete 9
              </Button>
            }
            secondaryAction={
              <Button size="sm" variant="secondary">
                Cancel
              </Button>
            }
            primaryAction={
              <Button size="sm" variant="primary">
                Approve 9
              </Button>
            }
          />
        </DialogShell>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Default (640)
        </div>
        <DialogShell
          size="md"
          title="Default dialog"
          description="Standard desktop modal width"
          onClose={() => {}}
        >
          <DialogBody>
            <div className="text-body">Content</div>
          </DialogBody>
          <DialogFooter
            secondaryAction={
              <Button size="sm" variant="secondary">
                Cancel
              </Button>
            }
            primaryAction={
              <Button size="sm" variant="primary">
                Confirm
              </Button>
            }
          />
        </DialogShell>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Large (760)
        </div>
        <DialogShell
          size="lg"
          title="Large dialog"
          description="For pickers and lists"
          onClose={() => {}}
        >
          <DialogBody>
            <div className="text-body">List items</div>
          </DialogBody>
          <DialogFooter
            secondaryAction={
              <Button size="sm" variant="secondary">
                Cancel
              </Button>
            }
            primaryAction={
              <Button size="sm" variant="primary">
                Apply
              </Button>
            }
          />
        </DialogShell>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Extra large (920)
        </div>
        <DialogShell
          size="xl"
          title="Extra large dialog"
          description="For wide data tables"
          onClose={() => {}}
        >
          <DialogBody>
            <div className="text-body">Table content</div>
          </DialogBody>
          <DialogFooter
            secondaryAction={
              <Button size="sm" variant="secondary">
                Cancel
              </Button>
            }
            primaryAction={
              <Button size="sm" variant="primary">
                Done
              </Button>
            }
          />
        </DialogShell>
      </div>
    </div>
  ),
};
