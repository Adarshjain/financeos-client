import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { ActionBar, Button, Icon, Menu, MenuItem, MenuSeparator, Text } from '@/components/ds';

const note = (
  <Text variant="label" tone="warning">
    Unsaved changes
  </Text>
);

const moreMenu = (
  <Menu
    align="start"
    side="top"
    trigger={
      <Button size="sm" variant="ghost" iconOnly aria-label="More options">
        <Icon name="more" size="sm" />
      </Button>
    }
  >
    <MenuItem>Duplicate report</MenuItem>
    <MenuItem>Add to dashboard</MenuItem>
    <MenuSeparator />
    <MenuItem destructive>Delete report</MenuItem>
  </Menu>
);

const meta = {
  title: 'DS/Actions/ActionBar',
  component: ActionBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, iframeHeight: 360 },
      description: {
        component:
          'The page-level action bar docked at the bottom. Phone: above the floating tab bar (the TabBar is a shell part, not drawn here). Desktop: a floating pill. Same surface as SelectionBar.',
      },
    },
  },
  args: {
    actions: {
      secondary: { label: 'Cancel', onSelect: fn() },
      primary: { label: 'Save report', onSelect: fn() },
    },
  },
  argTypes: {
    actions: { control: 'object' },
    start: { control: false },
  },
} satisfies Meta<typeof ActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithStartNote: Story = {
  args: { start: (<>{note}{moreMenu}</>) },
};

export const Loading: Story = {
  args: {
    actions: {
      secondary: { label: 'Cancel', onSelect: fn() },
      primary: { label: 'Saving report', loading: true, onSelect: fn() },
    },
  },
};

export const Disabled: Story = {
  args: {
    actions: {
      secondary: { label: 'Cancel', onSelect: fn() },
      primary: { label: 'Save report', disabled: true, onSelect: fn() },
    },
    start: note,
  },
};
