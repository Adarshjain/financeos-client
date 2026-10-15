import type { Meta, StoryObj } from '@storybook/react';
import { Check, MoreHorizontal, Plus, Search, Upload, X } from 'lucide-react';
import React from 'react';

import { Icon } from '../Icon/Icon';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'DS/Actions/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['secondary', 'primary', 'danger', 'danger-filled', 'ghost'],
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
            icon={<Icon icon={Search} size="md" />}
          />
          <Button
            variant="primary"
            iconOnly
            aria-label="Add"
            icon={<Icon icon={Plus} size="md" />}
          />
          <Button
            variant="ghost"
            iconOnly
            aria-label="More"
            icon={<Icon icon={MoreHorizontal} size="md" />}
          />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Remove"
            icon={<Icon icon={X} size="sm" />}
          />
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">With icon · with count</h3>
        <div className="flex flex-wrap items-center gap-space-8">
          <Button icon={<Icon icon={Upload} size="md" />}>Upload</Button>
          <Button icon={<Icon icon={Check} size="md" />} count={9}>
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

export const IconButton: Story = {
  render: () => (
    <div className="flex items-center gap-space-8">
      <Button
        variant="secondary"
        iconOnly
        aria-label="Search transactions"
        icon={<Icon icon={Search} size="md" />}
      />
      <Button
        variant="primary"
        iconOnly
        aria-label="Add entry"
        icon={<Icon icon={Plus} size="md" />}
      />
      <Button
        variant="ghost"
        iconOnly
        aria-label="More actions"
        icon={<Icon icon={MoreHorizontal} size="md" />}
      />
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label="Remove filter"
        icon={<Icon icon={X} size="sm" />}
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
    icon: <Icon icon={Upload} size="md" />,
    children: 'Upload statement',
  },
};

export const WithCount: Story = {
  args: {
    variant: 'secondary',
    icon: <Icon icon={Check} size="md" />,
    count: 9,
    children: 'Approve',
  },
};
