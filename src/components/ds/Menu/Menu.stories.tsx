import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import {
  Button,
  ContextMenu,
  Icon,
  ListRow,
  Menu,
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
        <Menu.Item>Edit</Menu.Item>
        <Menu.Item>Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Item tone="danger">Delete</Menu.Item>
      </>
    ),
  },
};

export const WithIconsAndHints: Story = {
  args: {
    trigger: defaultTrigger,
    children: (
      <>
        <Menu.Item
          icon={<Icon name="add" size="sm" />}
          hint="⌘N"
        >
          New item
        </Menu.Item>
        <Menu.Item
          icon={<Icon name="view" size="sm" />}
          hint="⌘E"
        >
          Quick view
        </Menu.Item>
        <Menu.Item icon={<Icon name="calendar" size="sm" />}>
          Schedule
        </Menu.Item>
      </>
    ),
  },
};

export const DisabledItem: Story = {
  args: {
    trigger: defaultTrigger,
    children: (
      <>
        <Menu.Item>Edit details</Menu.Item>
        <Menu.Item>Reassign category</Menu.Item>
        <Menu.Separator />
        <Menu.Item disabled hint="In use">
          Delete rule
        </Menu.Item>
      </>
    ),
  },
};

export const Sectioned: Story = {
  args: {
    trigger: defaultTrigger,
    children: (
      <>
        <Menu.Group label="Preferences">
          <Menu.Item active hint="Default">
            Primary view
          </Menu.Item>
          <Menu.Item>Compact layout</Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group label="Actions">
          <Menu.Item>Export data</Menu.Item>
          <Menu.Item tone="danger">Archive all</Menu.Item>
        </Menu.Group>
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
        <Menu.Item>Edit</Menu.Item>
        <Menu.Item>Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Item tone="danger">Delete</Menu.Item>
      </>
    ),
  },
};

export const ContextMenuAtPoint: StoryObj = {
  name: 'Menu at a press point',
  parameters: { docs: { description: { story: 'Controlled: open at a point, such as where a DataTable row was pressed (onRowSelect hands the point over). Works on phone and desktop.' } } },
  render: () => (
    <ContextMenu
      open
      point={{ x: 160, y: 120 }}
      onOpenChange={fn()}
      items={[
        { id: 'edit', label: 'Edit', onSelect: fn() },
        { id: 'clone', label: 'Clone', onSelect: fn() },
        { id: 'end-clone', label: 'End & clone', onSelect: fn(), disabled: true },
        { id: 'delete', label: 'Delete', tone: 'danger', onSelect: fn() },
      ]}
    />
  ),
};

export const ContextMenuOnRow: StoryObj = {
  name: 'Right-click menu',
  render: () => (
    <ContextMenu
      items={[
        { id: 'approve', label: 'Approve', onSelect: fn() },
        { id: 'delete', label: 'Delete', tone: 'danger', onSelect: fn() },
      ]}
    >
      <ListRow title="Right-click this row (desktop only)" />
    </ContextMenu>
  ),
};
