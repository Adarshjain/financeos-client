import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { RuleCard } from '@/components/organisms';

const meta: Meta<typeof RuleCard> = {
  title: 'Organisms/RuleCard',
  component: RuleCard,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-md w-full">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    tone: {
      control: 'select',
      options: ['warning', 'success'],
    },
    selected: {
      control: 'boolean',
    },
    selectionMode: {
      control: 'boolean',
    },
    selectable: {
      control: 'boolean',
    },
    usedCount: {
      control: 'number',
    },
    name: {
      control: 'text',
    },
    matchType: {
      control: 'text',
    },
    pattern: {
      control: 'text',
    },
    source: {
      control: 'text',
    },
    mcc: {
      control: 'text',
    },
    categories: {
      control: 'object',
    },
    menuItems: {
      control: 'object',
    },
    statusLine: {
      control: false,
    },
    categoryContent: {
      control: false,
    },
    approveAction: {
      control: false,
    },
  },
  args: {
    onApprove: fn(),
    onOpenDetail: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof RuleCard>;

export const Unverified: Story = {
  args: {
    name: 'Dunzo',
    matchType: 'Contains',
    pattern: 'DUNZO DAILY',
    usedCount: 4,
    tone: 'warning',
    source: 'LLM-generated',
    categories: ['Groceries'],
    menuItems: [
      { label: 'Find matches', onSelect: fn() },
      { label: 'Edit rule', onSelect: fn() },
      { label: 'Delete rule', onSelect: fn(), tone: 'danger' },
    ],
  },
};

export const Selected: Story = {
  args: {
    name: 'Lenskart',
    matchType: 'Contains',
    pattern: 'LENSKART',
    usedCount: 1,
    tone: 'warning',
    source: 'LLM-generated',
    categories: ['Shopping'],
    selectable: true,
    selected: true,
    selectionMode: true,
    onSelectedChange: fn(),
  },
  render: function SelectedStory(args) {
    const [{ selected = true }, updateArgs] = useArgs();
    return (
      <RuleCard
        {...args}
        selected={selected}
        selectionMode={selected}
        onSelectedChange={(s) => {
          args.onSelectedChange?.(s);
          updateArgs({ selected: s, selectionMode: s });
        }}
      />
    );
  },
};

export const Verified: Story = {
  args: {
    name: 'Swiggy',
    matchType: 'Starts with',
    pattern: 'SWIGGY',
    usedCount: 31,
    tone: 'success',
    source: 'Created by you',
    mcc: 'MCC 5812',
    categories: ['Food & dining'],
  },
};

export const SelectionModeNotSelected: Story = {
  args: {
    name: 'Third Wave Coffee',
    matchType: 'Contains',
    pattern: 'THIRD WAVE',
    usedCount: 2,
    tone: 'warning',
    source: 'LLM-generated',
    categories: ['Food & dining'],
    selectable: true,
    selectionMode: true,
    selected: false,
    onSelectedChange: fn(),
  },
  render: function SelectionModeNotSelectedStory(args) {
    const [{ selected = false, selectionMode = true }, updateArgs] = useArgs();
    return (
      <RuleCard
        {...args}
        selected={selected}
        selectionMode={selectionMode}
        onSelectedChange={(s) => {
          args.onSelectedChange?.(s);
          updateArgs({ selected: s, selectionMode: s });
        }}
      />
    );
  },
};

export const WithMenu: Story = {
  args: {
    name: 'Swiggy',
    matchType: 'Starts with',
    pattern: 'SWIGGY',
    usedCount: 31,
    tone: 'success',
    source: 'Created by you',
    categories: ['Food & dining'],
    menuItems: [
      { label: 'Find matches', onSelect: fn() },
      { label: 'Edit rule', onSelect: fn() },
      { label: 'Delete rule', onSelect: fn(), tone: 'danger' },
    ],
  },
};

export const SelectableInteractive: Story = {
  args: {
    name: 'Dunzo',
    matchType: 'Contains',
    pattern: 'DUNZO DAILY',
    usedCount: 4,
    tone: 'warning',
    source: 'LLM-generated',
    categories: ['Groceries'],
    selectable: true,
    selected: false,
    onSelectedChange: fn(),
  },
  render: function SelectableRuleCardStory(args) {
    const [{ selected = false }, updateArgs] = useArgs();
    return (
      <RuleCard
        {...args}
        selected={selected}
        selectionMode={selected}
        onSelectedChange={(s) => {
          args.onSelectedChange?.(s);
          updateArgs({ selected: s, selectionMode: s });
        }}
      />
    );
  },
};
