import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Icon } from '../Icon/Icon';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'DS/Actions/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'secondary',
        'primary',
        'danger',
        'danger-filled',
        'ghost',
        'google',
        'link',
        'tile',
      ],
    },
    iconPosition: {
      control: 'select',
      options: ['start', 'top'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'xl'],
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    iconOnly: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-space-24 max-w-2xl font-text p-space-16 bg-canvas">
      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Variants</h3>
        <div className="flex flex-wrap items-center gap-space-8">
          <Button variant="primary">Save</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="danger">Delete rule</Button>
          <Button variant="danger-filled">Delete</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="link">Reconcile</Button>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Sizes</h3>
        <div className="flex flex-wrap items-center gap-space-8">
          <Button size="sm">Small 26</Button>
          <Button size="md">Default 32</Button>
          <Button size="xl">Phone 44</Button>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">States · primary</h3>
        <div className="flex flex-wrap items-center gap-space-8">
          <Button variant="primary">Default</Button>
          <Button variant="primary" loading loadingLabel="Saving…">
            Save
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">States · secondary</h3>
        <div className="flex flex-wrap items-center gap-space-8">
          <Button variant="secondary">Default</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Icon buttons</h3>
        <div className="flex items-center gap-space-8">
          <Button
            variant="secondary"
            iconOnly
            aria-label="Search"
            icon={<Icon name="search" size="md" />}
          />
          <Button
            variant="primary"
            iconOnly
            aria-label="Add"
            icon={<Icon name="add" size="md" />}
          />
          <Button
            variant="ghost"
            iconOnly
            aria-label="More"
            icon={<Icon name="more" size="md" />}
          />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Remove"
            icon={<Icon name="close" size="sm" />}
          />
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">With icon · with count</h3>
        <div className="flex flex-wrap items-center gap-space-8">
          <Button icon={<Icon name="upload" size="md" />}>Upload</Button>
          <Button icon={<Icon name="check" size="md" />} count={9}>
            Approve
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Phone sheet footer</h3>
        <div className="flex gap-space-8 max-w-sm">
          <Button size="xl" className="flex-1">
            Cancel
          </Button>
          <Button size="xl" variant="primary" className="flex-1">
            Save
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Tile · Start (46px section links)</h3>
        <div className="grid grid-cols-2 gap-space-8 max-w-md">
          <Button variant="tile" icon={<Icon name="accounts" size="lg" />}>
            Accounts
          </Button>
          <Button variant="tile" icon={<Icon name="transactions" size="lg" />}>
            Transactions
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Tile · Top (64px quick add)</h3>
        <div className="grid grid-cols-4 gap-space-8 max-w-md">
          <Button variant="tile" iconPosition="top" icon={<Icon name="add" size="lg" />}>
            Transaction
          </Button>
          <Button variant="tile" iconPosition="top" icon={<Icon name="loans" size="lg" />}>
            Lending
          </Button>
          <Button variant="tile" iconPosition="top" icon={<Icon name="investments" size="lg" />}>
            Trade
          </Button>
          <Button variant="tile" iconPosition="top" icon={<Icon name="upload" size="lg" />}>
            Import
          </Button>
        </div>
      </div>

      <div className="max-w-sm">
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Google (sign-in pages)</h3>
        <Button variant="google" />
      </div>
    </div>
  ),
};

export const Google: Story = {
  args: {
    variant: 'google',
  },
  render: (args) => (
    <div className="p-space-24 bg-canvas min-h-full flex items-center justify-center">
      <div className="max-w-sm w-full">
        <Button {...args} />
      </div>
    </div>
  ),
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Cancel',
  },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Save & apply',
  },
};

export const DangerOutline: Story = {
  args: {
    variant: 'danger',
    children: 'Delete rule',
  },
};

export const DangerFilled: Story = {
  args: {
    variant: 'danger-filled',
    children: 'Delete statement',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Skip',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Reconcile',
  },
};

export const IconButton: Story = {
  render: () => (
    <div className="flex items-center gap-space-8">
      <Button
        variant="secondary"
        iconOnly
        aria-label="Search transactions"
        icon={<Icon name="search" size="md" />}
      />
      <Button
        variant="primary"
        iconOnly
        aria-label="Add entry"
        icon={<Icon name="add" size="md" />}
      />
      <Button
        variant="ghost"
        iconOnly
        aria-label="More actions"
        icon={<Icon name="more" size="md" />}
      />
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label="Remove filter"
        icon={<Icon name="close" size="sm" />}
      />
    </div>
  ),
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Approve rule',
  },
};

export const Default: Story = {
  args: {
    size: 'md',
    children: 'Mark paid',
  },
};

export const Phone: Story = {
  args: {
    size: 'xl',
    variant: 'primary',
    children: 'Save changes',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    loading: true,
    loadingLabel: 'Saving…',
    children: 'Save changes',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled action',
  },
};

export const WithIcon: Story = {
  args: {
    variant: 'secondary',
    icon: <Icon name="upload" size="md" />,
    children: 'Upload statement',
  },
};

export const WithCount: Story = {
  args: {
    variant: 'secondary',
    icon: <Icon name="check" size="md" />,
    count: 9,
    children: 'Approve',
  },
};

export const TileStart: Story = {
  args: {
    variant: 'tile',
    iconPosition: 'start',
    icon: <Icon name="accounts" size="lg" />,
    children: 'Accounts',
  },
  render: (args) => (
    <div className="p-space-24 bg-canvas max-w-xs">
      <Button {...args} />
    </div>
  ),
};

export const TileTop: Story = {
  args: {
    variant: 'tile',
    iconPosition: 'top',
    icon: <Icon name="add" size="lg" />,
    children: 'Transaction',
  },
  render: (args) => (
    <div className="p-space-24 bg-canvas max-w-xs">
      <Button {...args} />
    </div>
  ),
};
