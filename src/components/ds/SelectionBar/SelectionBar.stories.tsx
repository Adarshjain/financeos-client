import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Button, Icon, Menu, MenuItem, MenuSeparator, SelectionBar, type SelectionBarAction, Text } from '@/components/ds';

const sampleActions: SelectionBarAction[] = [
  {
    label: 'Archive',
    icon: <Icon name="inbox" size="sm" />,
    hint: 'store away',
    onSelect: fn(),
  },
  {
    label: 'Move',
    icon: <Icon name="upload" size="sm" />,
    hint: 'to folder',
    count: 2,
    onSelect: fn(),
  },
  {
    label: 'Delete',
    icon: <Icon name="delete" size="sm" />,
    hint: 'remove items',
    tone: 'danger',
    onSelect: fn(),
  },
];

const meta: Meta<typeof SelectionBar> = {
  title: 'DS/Actions/SelectionBar',
  component: SelectionBar,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="flex justify-center w-full max-w-3xl">
        <Story />
      </div>
    ),
  ],
  args: {
    count: 2,
    actions: sampleActions,
    onClear: fn(),
  },
  argTypes: {
    count: {
      control: 'number',
    },
    summary: {
      control: 'text',
    },
    selectAllLabel: {
      control: 'text',
    },
    actions: {
      control: 'object',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SelectionBar>;

export const Desktop: Story = {
  name: 'Desktop',
  args: {
    count: 2,
    summary: '2 selected items',
    actions: sampleActions,
    onSelectAll: fn(),
    selectAllLabel: 'Select all 182',
  },
};

export const PhoneDocked: Story = {
  name: 'Phone · docked',
  parameters: {
    viewport: { defaultViewport: 'phone' },
  },
  args: {
    count: 2,
    summary: '2 selected items',
    actions: sampleActions,
    onSelectAll: fn(),
    selectAllLabel: 'Select all 182',
  },
};

export const SingleAction: Story = {
  name: 'Single action',
  args: {
    count: 2,
    summary: 'Unverified items',
    actions: [
      {
        label: 'Archive',
        icon: <Icon name="inbox" size="sm" />,
        hint: 'store away',
        onSelect: fn(),
      },
    ],
    onSelectAll: fn(),
    selectAllLabel: 'Select all on page',
  },
};

export const ActionDisabled: Story = {
  name: 'Action not available',
  args: {
    count: 3,
    summary: 'Move requires exactly 2 items',
    actions: [
      {
        label: 'Move',
        icon: <Icon name="upload" size="sm" />,
        hint: 'to folder',
        disabled: true,
        onSelect: fn(),
      },
      {
        label: 'Delete',
        icon: <Icon name="delete" size="sm" />,
        hint: 'remove items',
        tone: 'danger',
        count: 3,
        onSelect: fn(),
      },
    ],
  },
};

export const WithoutSelectAll: Story = {
  name: 'Without select all',
  args: {
    count: 2,
    summary: 'Batch selection',
    actions: sampleActions,
  },
};

const pageNote = (
  <>
    <Text variant="label" tone="warning">
      Unsaved changes
    </Text>
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
  </>
);

export const PageActions: Story = {
  name: 'Page actions',
  args: {
    count: undefined,
    onClear: undefined,
    summary: pageNote,
    actions: [
      { label: 'Cancel', variant: 'link', onSelect: fn() },
      { label: 'Save report', variant: 'primary', onSelect: fn() },
    ],
  },
};

export const PageActionsLoading: Story = {
  name: 'Page actions loading',
  args: {
    ...PageActions.args,
    actions: [
      { label: 'Cancel', variant: 'link', onSelect: fn() },
      { label: 'Saving report', variant: 'primary', loading: true, onSelect: fn() },
    ],
  },
};
