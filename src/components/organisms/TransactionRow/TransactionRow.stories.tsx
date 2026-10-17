import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { Avatar, Card } from '@/components/ds';
import { TransactionRow } from '@/components/organisms';

const meta: Meta<typeof TransactionRow> = {
  title: 'Organisms/TransactionRow',
  component: TransactionRow,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <Card className="max-w-sm w-full p-0 overflow-hidden">
        <Story />
      </Card>
    ),
  ],
  argTypes: {
    description: {
      control: 'text',
      description: 'Merchant or main transaction description',
    },
    amount: {
      control: 'text',
      description: 'Formatted transaction amount',
    },
    balance: {
      control: 'text',
      description: 'Running balance below amount',
    },
    account: {
      control: 'text',
      description: 'Account name',
    },
    plastic: {
      control: 'text',
      description: 'Plastic / card suffix (••7741)',
    },
    reviewStatus: {
      control: 'text',
      description: 'Amber review status word',
    },
    provenance: {
      control: 'text',
      description: 'Provenance source (Statement, Gmail, Manual)',
    },
    isCredit: {
      control: 'boolean',
      description: 'Whether amount is credit (+ positive)',
    },
    selected: {
      control: 'boolean',
      description: 'Selected row state with 4px stripe',
    },
    selectable: {
      control: 'boolean',
      description: 'Whether row is selectable',
    },
    tone: {
      control: 'select',
      options: ['default', 'warning'],
      description: 'Visual tone (default or warning)',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state (dimmed)',
    },
    selectionMode: {
      control: 'boolean',
      description: 'Shows trailing eye button',
    },
    chevron: {
      control: 'boolean',
      description: 'Shows trailing chevron icon',
    },
    borderTop: {
      control: 'boolean',
      description: 'Shows top border line',
    },
    categories: {
      control: 'object',
      description: 'Assigned categories array',
    },
    link: {
      control: 'object',
      description: 'Link object or label',
    },
    note: {
      control: 'text',
      description: 'Note text',
    },
    unsetCategoryLabel: {
      control: 'text',
      description: 'Label for unset category',
    },
    leading: {
      control: false,
    },
    contextLine: {
      control: false,
    },
  },
  args: {
    onSelectedChange: fn(),
    onDetail: fn(),
    onSetCategory: fn(),
    onCategoryClick: fn(),
    onMoreCategoriesClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TransactionRow>;

export const Default: Story = {
  args: {
    description: 'BigBasket',
    amount: '3,600.00',
    balance: 'bal ₹61,757',
    account: 'HDFC Bank Savings',
    provenance: 'Statement',
    categories: ['Groceries'],
  },
};

export const Credit: Story = {
  args: {
    description: 'Salary · Bolt Technologies',
    amount: '+2,15,000.00',
    balance: 'bal ₹5,61,400',
    account: 'HDFC Bank Savings',
    provenance: 'Statement',
    categories: ['Salary'],
    isCredit: true,
  },
};

export const ReviewDuplicate: Story = {
  args: {
    description: 'Swiggy Bangalore',
    amount: '1,249.00',
    balance: 'bal ₹44,319',
    account: 'HDFC Regalia',
    plastic: '••7741',
    reviewStatus: 'Duplicate',
    provenance: 'Gmail',
    categories: ['Food & dining', 'Delivery'],
  },
};

export const TransferLink: Story = {
  args: {
    description: 'Card bill payment',
    amount: '44,319.00',
    account: 'HDFC Bank Savings',
    link: { label: 'Transfer out' },
    categories: ['Bills'],
  },
};

export const MonitoredUnset: Story = {
  args: {
    description: 'Truffles St Marks Road',
    amount: '1,860.00',
    account: 'Amex Platinum',
    plastic: '••1008',
    reviewStatus: 'Watching',
    provenance: 'Manual',
    categories: [],
    unsetCategoryLabel: 'Set category',
    tone: 'warning',
  },
};

export const SelectedSelectionMode: Story = {
  args: {
    description: 'Uber India',
    amount: '640.00',
    account: 'Amex Platinum',
    plastic: '••1008',
    link: { label: 'EMI #8 · HDFC car loan', isRecord: true },
    categories: ['Transport'],
    selected: true,
    selectionMode: true,
  },
};

export const Excluded: Story = {
  args: {
    description: 'Transfer to self',
    amount: '10,000.00',
    account: 'HDFC Bank Savings',
    provenance: 'Excluded',
    categories: ['Transfers'],
    disabled: true,
  },
};

export const WithLeadingAvatar: Story = {
  args: {
    description: 'HDFC Home Loan EMI',
    amount: '48,250.00',
    account: 'HDFC Bank Savings',
    categories: ['Housing'],
    chevron: true,
    leading: <Avatar variant="square" tone="inverse" initials="HD" size="md" />,
  },
};

export const SelectableInteractive: Story = {
  args: {
    description: 'Swiggy Bangalore',
    amount: '1,249.00',
    balance: 'bal ₹44,319',
    account: 'HDFC Regalia',
    plastic: '••7741',
    selectable: true,
    selected: false,
    categories: ['Food & dining'],
  },
  render: function SelectableRowStory(args) {
    const [{ selected }, updateArgs] = useArgs();
    return (
      <TransactionRow
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
