import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Card } from '../Card/Card';
import { DateGroupHeader } from '../DateGroupHeader/DateGroupHeader';
import { TransactionRow } from './TransactionRow';

const meta: Meta<typeof TransactionRow> = {
  title: 'DS/Data display/TransactionRow',
  component: TransactionRow,
  parameters: {
    layout: 'padded',
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
    monitored: true,
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
    excluded: true,
  },
};

export const AllVariants: Story = {
  parameters: {
    viewport: { defaultViewport: 'phone' },
  },
  render: () => (
    <div style={{ maxWidth: '24.375rem' }} className="w-full">
      <Card className="p-0 overflow-hidden">
        <DateGroupHeader date="12 Oct" weekday="Mon" borderTop={false} />
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
        />

        <DateGroupHeader date="11 Oct" weekday="Sun" />
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

const SelectableInteractiveDemo = () => {
  const [selected, setSelected] = React.useState(false);
  return (
    <div style={{ maxWidth: '24.375rem' }} className="w-full">
      <Card className="p-0 overflow-hidden">
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
    </div>
  );
};

export const SelectableInteractive: Story = {
  render: () => <SelectableInteractiveDemo />,
};
