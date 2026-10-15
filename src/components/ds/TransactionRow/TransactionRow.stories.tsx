import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Avatar } from '../Avatar/Avatar';
import { Card } from '../Card/Card';
import { SectionHeader } from '../SectionHeader/SectionHeader';
import { TransactionRow } from './TransactionRow';

const meta: Meta<typeof TransactionRow> = {
  title: 'DS/Data display/TransactionRow',
  component: TransactionRow,
  parameters: {
    layout: 'padded',
  },
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
    monitored: {
      control: 'boolean',
      description: 'Monitored / watching state',
    },
    excluded: {
      control: 'boolean',
      description: 'Excluded state (dimmed)',
    },
    selectionMode: {
      control: 'boolean',
      description: 'Shows trailing eye button',
    },
    chevron: {
      control: 'boolean',
      description: 'Shows trailing chevron icon',
    },
  },
};

export default meta;
type Story = StoryObj<typeof TransactionRow>;

export const AllVariants: Story = {
  name: 'All variants',
  parameters: {
    viewport: { defaultViewport: 'phone' },
  },
  render: () => (
    <div className="max-w-sm w-full font-text">
      <Card className="p-0 overflow-hidden">
        <SectionHeader variant="date" label="12 Oct" meta="Mon" borderTop={false} />
        <TransactionRow
          description="BigBasket"
          amount="3,600.00"
          balance="bal ₹61,757"
          account="HDFC Bank Savings"
          provenance="Statement"
          categories={['Groceries']}
        />
        <TransactionRow
          description="Salary · Bolt Technologies"
          amount="+2,15,000.00"
          balance="bal ₹5,61,400"
          account="HDFC Bank Savings"
          provenance="Statement"
          categories={['Salary']}
          isCredit
        />

        <SectionHeader variant="date" label="11 Oct" meta="Sun" />
        <TransactionRow
          description="Swiggy Bangalore"
          amount="1,249.00"
          balance="bal ₹44,319"
          account="HDFC Regalia"
          plastic="••7741"
          reviewStatus="Duplicate"
          provenance="Gmail"
          categories={['Food & dining', 'Delivery']}
        />
        <TransactionRow
          description="Card bill payment"
          amount="44,319.00"
          account="HDFC Bank Savings"
          link={{ label: 'Transfer out' }}
          categories={['Bills']}
        />
        <TransactionRow
          description="Truffles St Marks Road"
          amount="1,860.00"
          account="Amex Platinum"
          plastic="••1008"
          reviewStatus="Watching"
          provenance="Manual"
          categories={[]}
          monitored
        />
        <TransactionRow
          description="Uber India"
          amount="640.00"
          account="Amex Platinum"
          plastic="••1008"
          link={{ label: 'EMI #8 · HDFC car loan', isRecord: true }}
          categories={['Transport']}
          selected
          selectionMode
        />
        <TransactionRow
          description="Transfer to self"
          amount="10,000.00"
          account="HDFC Bank Savings"
          provenance="Excluded"
          categories={['Transfers']}
          excluded
        />
      </Card>
    </div>
  ),
};

export const Default: Story = {
  name: 'Default',
  args: {
    description: 'BigBasket',
    amount: '3,600.00',
    balance: 'bal ₹61,757',
    account: 'HDFC Bank Savings',
    provenance: 'Statement',
    categories: ['Groceries'],
  },
  render: (args) => (
    <Card className="max-w-sm w-full p-0 overflow-hidden">
      <TransactionRow {...args} />
    </Card>
  ),
};

export const Credit: Story = {
  name: 'Credit',
  args: {
    description: 'Salary · Bolt Technologies',
    amount: '+2,15,000.00',
    balance: 'bal ₹5,61,400',
    account: 'HDFC Bank Savings',
    provenance: 'Statement',
    categories: ['Salary'],
    isCredit: true,
  },
  render: (args) => (
    <Card className="max-w-sm w-full p-0 overflow-hidden">
      <TransactionRow {...args} />
    </Card>
  ),
};

export const ReviewDuplicate: Story = {
  name: 'ReviewDuplicate',
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
  render: (args) => (
    <Card className="max-w-sm w-full p-0 overflow-hidden">
      <TransactionRow {...args} />
    </Card>
  ),
};

export const TransferLink: Story = {
  name: 'TransferLink',
  args: {
    description: 'Card bill payment',
    amount: '44,319.00',
    account: 'HDFC Bank Savings',
    link: { label: 'Transfer out' },
    categories: ['Bills'],
  },
  render: (args) => (
    <Card className="max-w-sm w-full p-0 overflow-hidden">
      <TransactionRow {...args} />
    </Card>
  ),
};

export const MonitoredUnset: Story = {
  name: 'MonitoredUnset',
  args: {
    description: 'Truffles St Marks Road',
    amount: '1,860.00',
    account: 'Amex Platinum',
    plastic: '••1008',
    reviewStatus: 'Watching',
    provenance: 'Manual',
    categories: [],
    monitored: true,
  },
  render: (args) => (
    <Card className="max-w-sm w-full p-0 overflow-hidden">
      <TransactionRow {...args} />
    </Card>
  ),
};

export const SelectedSelectionMode: Story = {
  name: 'SelectedSelectionMode',
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
  render: (args) => (
    <Card className="max-w-sm w-full p-0 overflow-hidden">
      <TransactionRow {...args} />
    </Card>
  ),
};

export const Excluded: Story = {
  name: 'Excluded',
  args: {
    description: 'Transfer to self',
    amount: '10,000.00',
    account: 'HDFC Bank Savings',
    provenance: 'Excluded',
    categories: ['Transfers'],
    excluded: true,
  },
  render: (args) => (
    <Card className="max-w-sm w-full p-0 overflow-hidden">
      <TransactionRow {...args} />
    </Card>
  ),
};

export const WithLeadingAvatar: Story = {
  name: 'WithLeadingAvatar',
  args: {
    description: 'HDFC Home Loan EMI',
    amount: '48,250.00',
    account: 'HDFC Bank Savings',
    categories: ['Housing'],
    chevron: true,
  },
  render: (args) => (
    <Card className="max-w-sm w-full p-0 overflow-hidden">
      <TransactionRow
        {...args}
        leading={<Avatar variant="logo" initials="HD" size="md" />}
      />
    </Card>
  ),
};

const SelectableInteractiveDemo = () => {
  const [selected, setSelected] = useState(false);
  return (
    <Card className="max-w-sm w-full p-0 overflow-hidden font-text">
      <TransactionRow
        description="Swiggy Bangalore"
        amount="1,249.00"
        balance="bal ₹44,319"
        account="HDFC Regalia"
        plastic="••7741"
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        onDetail={() => alert('View detail clicked')}
        categories={['Food & dining']}
      />
    </Card>
  );
};

export const SelectableInteractive: Story = {
  name: 'SelectableInteractive',
  render: () => <SelectableInteractiveDemo />,
};
