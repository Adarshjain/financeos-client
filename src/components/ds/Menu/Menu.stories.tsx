import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import {
  Button,
  Icon,
  Menu,
  MenuGroup,
  MenuItem,
  MenuSeparator,
} from '@/components/ds';

const meta: Meta<typeof Menu> = {
  title: 'DS/Actions/Menu',
  component: Menu,
  parameters: {
    layout: 'padded',
    docs: {
      story: {
        inline: false,
        iframeHeight: 350,
      },
      description: {
        component:
          'A list of actions that opens from a trigger: the ⋮ menu on a rule or account, the dashboard ⋯ menu, snooze presets.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-72">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    align: {
      control: { type: 'select' },
      options: ['start', 'center', 'end'],
    },
    side: {
      control: { type: 'select' },
      options: ['top', 'bottom', 'left', 'right'],
    },
    open: {
      control: { type: 'boolean' },
    },
    trigger: { control: false },
    children: { control: false },
    onOpenChange: { control: false },
    contentProps: { control: false },
  },
  args: {
    align: 'start',
    side: 'bottom',
    open: true,
    onOpenChange: fn(),
  },
  render: function Render(args) {
    const [{ open }, updateArgs] = useArgs();
    return (
      <Menu
        {...args}
        open={open}
        onOpenChange={(val) => {
          args.onOpenChange?.(val);
          updateArgs({ open: val });
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof Menu>;

const defaultTrigger = (
  <Button
    size="sm"
    variant="ghost"
    iconOnly
    aria-label="More options"
  >
    <Icon name="more" size="sm" />
  </Button>
);

export const Default: Story = {
  args: {
    trigger: defaultTrigger,
    children: (
      <>
        <MenuItem>Edit</MenuItem>
        <MenuItem>Duplicate</MenuItem>
        <MenuSeparator />
        <MenuItem destructive>Delete</MenuItem>
      </>
    ),
  },
};

export const WithIconsAndHints: Story = {
  args: {
    trigger: defaultTrigger,
    children: (
      <>
        <MenuItem
          icon={<Icon name="add" size="sm" />}
          hint="⌘N"
        >
          New item
        </MenuItem>
        <MenuItem
          icon={<Icon name="view" size="sm" />}
          hint="⌘E"
        >
          Quick view
        </MenuItem>
        <MenuItem icon={<Icon name="calendar" size="sm" />}>
          Schedule
        </MenuItem>
      </>
    ),
  },
};

export const DisabledItem: Story = {
  args: {
    trigger: defaultTrigger,
    children: (
      <>
        <MenuItem>Edit details</MenuItem>
        <MenuItem>Reassign category</MenuItem>
        <MenuSeparator />
        <MenuItem disabled hint="In use">
          Delete rule
        </MenuItem>
      </>
    ),
  },
};

export const Sectioned: Story = {
  args: {
    trigger: defaultTrigger,
    children: (
      <>
        <MenuGroup label="Preferences">
          <MenuItem active hint="Default">
            Primary view
          </MenuItem>
          <MenuItem>Compact layout</MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup label="Actions">
          <MenuItem>Export data</MenuItem>
          <MenuItem destructive>Archive all</MenuItem>
        </MenuGroup>
      </>
    ),
  },
};

export const LabelledTrigger: Story = {
  args: {
    trigger: (
      <Button variant="secondary" icon={<Icon name="chevron-down" />}>
        Options
      </Button>
    ),
    children: (
      <>
        <MenuItem>Edit</MenuItem>
        <MenuItem>Duplicate</MenuItem>
        <MenuSeparator />
        <MenuItem destructive>Delete</MenuItem>
      </>
    ),
  },
};
