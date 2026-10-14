import type { Meta, StoryObj } from '@storybook/react';
import { Check, MoreHorizontal, Plus, Search, Upload, X } from 'lucide-react';

import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'DS/Actions/Button',
  component: Button,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

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
        icon={<Search className="h-space-16 w-space-16" />}
      />
      <Button
        variant="primary"
        iconOnly
        aria-label="Add entry"
        icon={<Plus className="h-space-16 w-space-16" />}
      />
      <Button
        variant="ghost"
        iconOnly
        aria-label="More actions"
        icon={<MoreHorizontal className="h-space-14 w-space-14" />}
      />
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label="Remove filter"
        icon={<X className="h-space-12 w-space-12" />}
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
    icon: <Upload className="h-space-14 w-space-14" />,
    children: 'Upload statement',
  },
};

export const WithCount: Story = {
  args: {
    variant: 'secondary',
    icon: <Check className="h-space-14 w-space-14" />,
    count: 9,
    children: 'Approve',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-space-24 max-w-2xl font-text">
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
            icon={<Search className="h-space-16 w-space-16" />}
          />
          <Button
            variant="primary"
            iconOnly
            aria-label="Add"
            icon={<Plus className="h-space-16 w-space-16" />}
          />
          <Button
            variant="ghost"
            iconOnly
            aria-label="More"
            icon={<MoreHorizontal className="h-space-14 w-space-14" />}
          />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Remove"
            icon={<X className="h-space-12 w-space-12" />}
          />
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">With icon · with count</h3>
        <div className="flex flex-wrap items-center gap-space-8">
          <Button icon={<Upload className="h-space-14 w-space-14" />}>Upload</Button>
          <Button icon={<Check className="h-space-14 w-space-14" />} count={9}>
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
