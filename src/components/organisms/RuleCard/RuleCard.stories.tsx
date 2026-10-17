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
    status: {
      control: 'select',
      options: ['unverified', 'verified'],
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
    onDetail: fn(),
    onSelectedChange: fn(),
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
    status: 'unverified',
    source: 'LLM-generated',
    categories: ['Groceries'],
  },
};

export const Selected: Story = {
  args: {
    name: 'Lenskart',
    matchType: 'Contains',
    pattern: 'LENSKART',
    usedCount: 1,
    status: 'unverified',
    source: 'LLM-generated',
    categories: ['Shopping'],
    selected: true,
    selectionMode: true,
  },
};

export const Verified: Story = {
  args: {
    name: 'Swiggy',
    matchType: 'Starts with',
    pattern: 'SWIGGY',
    usedCount: 31,
    status: 'verified',
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
    status: 'unverified',
    source: 'LLM-generated',
    categories: ['Food & dining'],
    selectionMode: true,
    selected: false,
  },
};

export const WithMenu: Story = {
  args: {
    name: 'Swiggy',
    matchType: 'Starts with',
    pattern: 'SWIGGY',
    usedCount: 31,
    status: 'verified',
    source: 'Created by you',
    categories: ['Food & dining'],
    menuItems: [
      { label: 'Find matches', onSelect: fn() },
      { label: 'Edit rule', onSelect: fn() },
      { label: 'Delete rule', onSelect: fn(), destructive: true },
    ],
  },
};

export const SelectableInteractive: Story = {
  args: {
    name: 'Dunzo',
    matchType: 'Contains',
    pattern: 'DUNZO DAILY',
    usedCount: 4,
    status: 'unverified',
    source: 'LLM-generated',
    categories: ['Groceries'],
    selectable: true,
    selected: false,
  },
  render: function SelectableRuleCardStory(args) {
    const [{ selected }, updateArgs] = useArgs();
    return (
      <RuleCard
        {...args}
        selected={selected}
        onSelectedChange={(s) => {
          args.onSelectedChange?.(s);
          updateArgs({ selected: s });
        }}
      />
    );
  },
};
