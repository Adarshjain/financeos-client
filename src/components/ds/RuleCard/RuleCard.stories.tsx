import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { RuleCard } from './RuleCard';

const meta: Meta<typeof RuleCard> = {
  title: 'DS/Data display/RuleCard',
  component: RuleCard,
  parameters: {
    layout: 'padded',
  },
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
  },
};

export default meta;
type Story = StoryObj<typeof RuleCard>;

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-12 w-full max-w-xl items-start">
      <RuleCard
        name="Dunzo"
        matchType="Contains"
        pattern="DUNZO DAILY"
        usedCount={4}
        status="unverified"
        source="LLM-generated"
        categories={['Groceries']}
        onApprove={() => {}}
      />

      <RuleCard
        name="Lenskart"
        matchType="Contains"
        pattern="LENSKART"
        usedCount={1}
        status="unverified"
        source="LLM-generated"
        categories={['Shopping']}
        selected
        selectionMode
      />

      <RuleCard
        name="Swiggy"
        matchType="Starts with"
        pattern="SWIGGY"
        usedCount={31}
        status="verified"
        source="Created by you"
        mcc="MCC 5812"
        categories={['Food & dining']}
      />

      <RuleCard
        name="Third Wave Coffee"
        matchType="Contains"
        pattern="THIRD WAVE"
        usedCount={2}
        status="unverified"
        source="LLM-generated"
        categories={['Food & dining']}
        selectionMode
      />
    </div>
  ),
};

export const Unverified: Story = {
  args: {
    name: 'Dunzo',
    matchType: 'Contains',
    pattern: 'DUNZO DAILY',
    usedCount: 4,
    status: 'unverified',
    source: 'LLM-generated',
    categories: ['Groceries'],
    onApprove: () => alert('Rule approved!'),
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
    onViewDetail: () => alert('View rule details'),
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
    onViewDetail: () => alert('View rule details'),
  },
};

const SelectableRuleCardDemo = () => {
  const [selected, setSelected] = React.useState(false);
  return (
    <div className="max-w-md">
      <RuleCard
        name="Dunzo"
        matchType="Contains"
        pattern="DUNZO DAILY"
        usedCount={4}
        status="unverified"
        source="LLM-generated"
        categories={['Groceries']}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        onDetail={() => alert('View rule details')}
      />
    </div>
  );
};

export const SelectableInteractive: Story = {
  render: () => <SelectableRuleCardDemo />,
};
