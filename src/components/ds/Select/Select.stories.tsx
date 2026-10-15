import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Avatar } from '../Avatar/Avatar';
import { Select, SelectMenu, type SelectOption } from './Select';

const meta = {
  title: 'DS/Inputs/Select',
  component: Select,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const singleOptions: SelectOption[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'exact', label: 'Exact' },
  { value: 'regex', label: 'Regex' },
];

export const SingleSelect: Story = {
  render: () => {
    return (
      <div className="max-w-xs space-y-space-12">
        <Select
          label="Filter operator"
          options={singleOptions}
          defaultValue="starts_with"
        />
        <div className="pt-space-8">
          <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
            Menu view
          </span>
          <SelectMenu options={singleOptions} value="starts_with" />
        </div>
      </div>
    );
  },
};

const bankOptions: SelectOption[] = [
  {
    value: 'hdfc',
    label: 'HDFC Bank',
    icon: (
      <Avatar variant="logo" size="sm">
        HD
      </Avatar>
    ),
  },
  {
    value: 'icici',
    label: 'ICICI Bank',
    icon: (
      <Avatar variant="logo" size="sm" className="bg-danger text-on-brand">
        IC
      </Avatar>
    ),
  },
  {
    value: 'sbi',
    label: 'State Bank of India',
    icon: (
      <Avatar variant="logo" size="sm" className="bg-info text-on-brand">
        SB
      </Avatar>
    ),
  },
];

export const SingleWithSearchAndIcons: Story = {
  render: () => {
    return (
      <div className="max-w-xs space-y-space-12">
        <Select
          label="Bank account"
          searchable
          searchPlaceholder="Search banks"
          options={bankOptions}
          defaultValue="hdfc"
        />
        <div className="pt-space-8">
          <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
            Menu view
          </span>
          <SelectMenu
            searchable
            searchPlaceholder="Search banks"
            options={bankOptions}
            value="hdfc"
          />
        </div>
      </div>
    );
  },
};

const statusOptions: SelectOption[] = [
  { value: 'unreconciled', label: 'Unreconciled' },
  { value: 'category_unverified', label: 'Category unverified' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'date_corrected', label: 'Date corrected' },
];

function MultiSelectDemo() {
  const [val, setVal] = useState<string[]>(['unreconciled', 'duplicate']);
  return (
    <div className="max-w-xs space-y-space-12">
      <Select
        label="Transaction flags"
        multiple
        options={statusOptions}
        value={val}
        onChange={(v) => setVal(v as string[])}
      />
      <div className="pt-space-8">
        <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
          Menu view
        </span>
        <SelectMenu
          multiple
          options={statusOptions}
          value={val}
          onSelect={(itemVal) =>
            setVal((prev) =>
              prev.includes(itemVal)
                ? prev.filter((x) => x !== itemVal)
                : [...prev, itemVal],
            )
          }
          onClear={() => setVal([])}
        />
      </div>
    </div>
  );
}

export const MultiSelect: Story = {
  render: () => <MultiSelectDemo />,
};

const categoryOptions: SelectOption[] = [
  { value: 'food', label: 'Food & dining' },
  { value: 'fast_food', label: 'Fast food' },
  { value: 'groceries', label: 'Groceries' },
];

function MultiWithSearchDemo() {
  const [val, setVal] = useState<string[]>(['food']);
  const [search, setSearch] = useState('food');
  return (
    <div className="max-w-xs">
      <SelectMenu
        multiple
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        options={categoryOptions}
        value={val}
        onSelect={(itemVal) =>
          setVal((prev) =>
            prev.includes(itemVal)
              ? prev.filter((x) => x !== itemVal)
              : [...prev, itemVal],
          )
        }
        onCreate={(q) => alert(`Create category "${q}"`)}
        createLabel={(q) => `Create "${q}"`}
      />
    </div>
  );
}

export const MultiWithSearch: Story = {
  render: () => <MultiWithSearchDemo />,
};

const sectionedGroups = [
  {
    name: 'Bank accounts',
    options: [
      { value: 'hdfc_sav', label: 'HDFC Bank Savings', hint: '••4521' },
      { value: 'icici_sal', label: 'ICICI Salary', hint: '••8832' },
    ],
  },
  {
    name: 'Credit cards',
    options: [
      { value: 'regalia', label: 'HDFC Regalia Gold', hint: '••7741' },
      { value: 'amex', label: 'Amex Platinum', hint: '••1008' },
    ],
  },
  {
    name: 'Wallets & cash',
    options: [{ value: 'paytm', label: 'Paytm Wallet' }],
  },
];

export const SectionedList: Story = {
  render: () => {
    return (
      <div className="max-w-xs space-y-space-12">
        <Select
          label="Account"
          groups={sectionedGroups}
          defaultValue="regalia"
        />
        <div className="pt-space-8">
          <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
            Menu view
          </span>
          <SelectMenu groups={sectionedGroups} value="regalia" />
        </div>
      </div>
    );
  },
};

const sharedLimitOptions: SelectOption[] = [
  {
    value: 'none',
    label: 'None',
    description: 'This card has its own limit',
  },
  {
    value: 'hdfc_pool',
    label: 'HDFC cards',
    description: '₹5,00,000 · 2 cards',
  },
];

export const WithAnActionRow: Story = {
  render: () => {
    return (
      <div className="max-w-xs">
        <SelectMenu
          options={sharedLimitOptions}
          value="hdfc_pool"
          actionRow="+ New shared limit…"
          onActionClick={() => alert('New shared limit clicked')}
        />
      </div>
    );
  },
};

const counterpartyOptions: SelectOption[] = [
  {
    value: 'rahul',
    label: 'Rahul Sharma',
    hint: 'owes ₹15,000',
    icon: (
      <Avatar variant="person" size="sm">
        RS
      </Avatar>
    ),
  },
];

export const SearchCreateFromTyping: Story = {
  render: () => {
    return (
      <div className="max-w-xs">
        <SelectMenu
          searchable
          searchValue="Rahul S"
          options={counterpartyOptions}
          onCreate={(q) => alert(`Add "${q}"`)}
          createLabel={(q) => `+ Add "${q}"`}
        />
      </div>
    );
  },
};

export const NoResults: Story = {
  render: () => {
    return (
      <div className="max-w-xs">
        <SelectMenu
          searchable
          searchValue="xyz bank"
          options={bankOptions}
          emptyText={(q) => `No banks match "${q}".`}
        />
      </div>
    );
  },
};

const repaymentOptions: SelectOption[] = [
  {
    value: 'full',
    label: 'Paid in full',
    description: '₹44,319',
  },
  {
    value: 'min',
    label: 'Minimum due',
    description: '₹2,500',
  },
  {
    value: 'custom',
    label: 'Other amount',
  },
];

export const WithDescriptions: Story = {
  render: () => {
    return (
      <div className="max-w-xs">
        <SelectMenu
          showRadio
          options={repaymentOptions}
          value="full"
        />
      </div>
    );
  },
};

const transferOptions: SelectOption[] = [
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  {
    value: 'transfer',
    label: 'Transfer',
    disabled: true,
    disabledReason: 'use Link instead',
  },
];

export const DisabledOption: Story = {
  render: () => {
    return (
      <div className="max-w-xs">
        <SelectMenu options={transferOptions} />
      </div>
    );
  },
};

function ClosedFieldStatesDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 p-space-16 max-w-2xl bg-canvas rounded-ds-lg border border-line">
      <div className="space-y-space-4">
        <span className="font-text text-caption font-semibold text-ink-3">
          Single · value
        </span>
        <Select options={singleOptions} defaultValue="starts_with" />
      </div>

      <div className="space-y-space-4">
        <span className="font-text text-caption font-semibold text-ink-3">
          Single · placeholder
        </span>
        <Select
          options={singleOptions}
          placeholder="Choose a category"
        />
      </div>

      <div className="space-y-space-4">
        <span className="font-text text-caption font-semibold text-ink-3">
          With icon
        </span>
        <Select
          options={bankOptions}
          defaultValue="hdfc"
          icon={
            <Avatar variant="logo" size="sm">
              HD
            </Avatar>
          }
        />
      </div>

      <div className="space-y-space-4">
        <span className="font-text text-caption font-semibold text-ink-3">
          Multi · chips
        </span>
        <Select
          multiple
          options={statusOptions}
          defaultValue={['unreconciled', 'duplicate']}
        />
      </div>

      <div className="space-y-space-4">
        <span className="font-text text-caption font-semibold text-ink-3">
          Multi · overflow (+2)
        </span>
        <Select
          multiple
          options={[
            { value: 'food', label: 'Food & dining' },
            { value: 'groceries', label: 'Groceries' },
            { value: 'travel', label: 'Travel' },
            { value: 'bills', label: 'Bills' },
          ]}
          defaultValue={['food', 'groceries', 'travel', 'bills']}
          maxDisplayChips={2}
        />
      </div>

      <div className="space-y-space-4">
        <span className="font-text text-caption font-semibold text-ink-3">
          Error
        </span>
        <Select
          options={bankOptions}
          placeholder="Choose an account"
          error="Pick the account this statement belongs to."
        />
      </div>

      <div className="space-y-space-4">
        <span className="font-text text-caption font-semibold text-ink-3">
          Disabled
        </span>
        <Select
          disabled
          options={[{ value: 'monthly', label: 'Monthly' }]}
          defaultValue="monthly"
        />
      </div>

      <div className="space-y-space-4">
        <span className="font-text text-caption font-semibold text-ink-3">
          Locked
        </span>
        <Select
          locked
          options={[
            {
              value: 'regalia',
              label: 'HDFC Regalia Gold ••7741',
            },
          ]}
          defaultValue="regalia"
        />
      </div>

      <div className="space-y-space-4">
        <span className="font-text text-caption font-semibold text-ink-3">
          Loading options
        </span>
        <Select
          loading
          loadingText="Loading accounts…"
          options={[]}
        />
      </div>
    </div>
  );
}

export const ClosedFieldStates: Story = {
  render: () => <ClosedFieldStatesDemo />,
};

export const AllVariants: Story = {
  render: () => {
    return (
      <div className="space-y-space-24 max-w-4xl">
        <ClosedFieldStatesDemo />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 p-space-16 bg-canvas rounded-ds-lg border border-line">
          <div>
            <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
              Single select
            </span>
            <SelectMenu options={singleOptions} value="starts_with" />
          </div>
          <div>
            <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
              Single · with search and icons
            </span>
            <SelectMenu
              searchable
              searchPlaceholder="Search banks"
              options={bankOptions}
              value="hdfc"
            />
          </div>
          <div>
            <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
              Multi select
            </span>
            <SelectMenu
              multiple
              options={statusOptions}
              value={['unreconciled', 'duplicate']}
            />
          </div>
          <div>
            <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
              Multi · with search
            </span>
            <SelectMenu
              multiple
              searchable
              searchValue="food"
              options={categoryOptions}
              value={['food']}
              onCreate={() => {}}
              createLabel={(q) => `Create "${q}"`}
            />
          </div>
          <div>
            <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
              Sectioned list
            </span>
            <SelectMenu groups={sectionedGroups} value="regalia" />
          </div>
          <div>
            <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
              With an action row
            </span>
            <SelectMenu
              options={sharedLimitOptions}
              value="hdfc_pool"
              actionRow="+ New shared limit…"
            />
          </div>
          <div>
            <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
              Search · create from typing
            </span>
            <SelectMenu
              searchable
              searchValue="Rahul S"
              options={counterpartyOptions}
              onCreate={() => {}}
              createLabel={(q) => `+ Add "${q}"`}
            />
          </div>
          <div>
            <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
              No results
            </span>
            <SelectMenu
              searchable
              searchValue="xyz bank"
              options={bankOptions}
              emptyText={(q) => `No banks match "${q}".`}
            />
          </div>
          <div>
            <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
              With descriptions
            </span>
            <SelectMenu
              showRadio
              options={repaymentOptions}
              value="full"
            />
          </div>
          <div>
            <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
              Disabled option
            </span>
            <SelectMenu options={transferOptions} />
          </div>
        </div>
      </div>
    );
  },
};
