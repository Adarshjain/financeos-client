import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';

import { Avatar } from '../Avatar/Avatar';
import { FilterChip } from '../FilterChip/FilterChip';
import { Select, SelectMenu, type SelectOption } from './Select';

const singleOptions: SelectOption[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'exact', label: 'Exact' },
  { value: 'regex', label: 'Regex' },
];

const bankOptions: SelectOption[] = [
  {
    value: 'hdfc',
    label: 'HDFC Bank',
    icon: (
      <Avatar
        variant="logo"
        size="sm"
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='16' height='16'%3E%3Crect width='24' height='24' fill='%23004c8f'/%3E%3Ctext x='12' y='16' text-anchor='middle' fill='white' font-family='sans-serif' font-size='10' font-weight='bold'%3EHD%3C/text%3E%3C/svg%3E"
      >
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

const statusOptions: SelectOption[] = [
  { value: 'unreconciled', label: 'Unreconciled' },
  { value: 'unverified', label: 'Category unverified' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'corrected', label: 'Date corrected' },
];

const categoryOptions: SelectOption[] = [
  { value: 'food', label: 'Food & dining' },
  { value: 'fast_food', label: 'Fast food' },
];

const sectionedGroups = [
  {
    name: 'Bank accounts',
    options: [
      { value: 'hdfc_savings', label: 'HDFC Bank Savings', hint: '••4521' },
      { value: 'icici_salary', label: 'ICICI Salary', hint: '••8832' },
    ],
  },
  {
    name: 'Credit cards',
    options: [
      { value: 'regalia', label: 'HDFC Regalia Gold' },
      { value: 'amex', label: 'Amex Platinum', hint: '••1008' },
    ],
  },
  {
    name: 'Wallets & cash',
    options: [{ value: 'paytm', label: 'Paytm Wallet' }],
  },
];

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

const repaymentOptions: SelectOption[] = [
  { value: 'full', label: 'Paid in full', description: '₹44,319' },
  { value: 'min', label: 'Minimum due', description: '₹2,500' },
  { value: 'other', label: 'Other amount' },
];

const transferOptions: SelectOption[] = [
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  {
    value: 'transfer',
    label: 'Transfer',
    disabled: true,
    hint: 'use Link instead',
  },
];

const meta: Meta<typeof Select> = {
  title: 'DS/Inputs/Select',
  component: Select,
  argTypes: {
    placeholder: { control: { type: 'text' } },
    label: { control: { type: 'text' } },
    error: { control: { type: 'text' } },
    helper: { control: { type: 'text' } },
    disabled: { control: { type: 'boolean' } },
    multiple: { control: { type: 'boolean' } },
    searchable: { control: { type: 'boolean' } },
    loading: { control: { type: 'boolean' } },
    defaultOpen: { control: { type: 'boolean' } },
  },
  parameters: {
    layout: 'padded',
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <Select
        {...args}
        value={value ?? args.defaultValue}
        onValueChange={(val) => updateArgs({ value: val })}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const AllVariants: Story = {
  render: () => {
    return (
      <div className="space-y-space-24 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 p-space-16 bg-canvas rounded-ds-lg border border-line">
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
              options={categoryOptions}
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
                <Avatar
                  variant="logo"
                  size="sm"
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='16' height='16'%3E%3Crect width='24' height='24' fill='%23004c8f'/%3E%3Ctext x='12' y='16' text-anchor='middle' fill='white' font-family='sans-serif' font-size='10' font-weight='bold'%3EHD%3C/text%3E%3C/svg%3E"
                >
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
              Multi · overflow
            </span>
            <Select
              multiple
              options={[
                { value: 'food', label: 'Food & dining' },
                { value: 'groceries', label: 'Groceries' },
                { value: 'fuel', label: 'Fuel' },
                { value: 'travel', label: 'Travel' },
              ]}
              defaultValue={['food', 'groceries', 'fuel', 'travel']}
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
              Loading options
            </span>
            <Select
              loading
              loadingText="Loading accounts…"
              options={[]}
            />
          </div>

          <div className="space-y-space-4">
            <span className="font-text text-caption font-semibold text-ink-3">
              Custom trigger (FilterChip)
            </span>
            <Select
              options={sectionedGroups[1].options}
              defaultValue="regalia"
              trigger={
                <FilterChip active hasDropdown>
                  Account · 2
                </FilterChip>
              }
            />
          </div>
        </div>

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

export const SingleSelect: Story = {
  args: {
    label: 'Filter operator',
    options: singleOptions,
    defaultValue: 'starts_with',
  },
};

export const SingleWithSearchAndIcons: Story = {
  args: {
    label: 'Bank account',
    searchable: true,
    searchPlaceholder: 'Search banks',
    options: bankOptions,
    defaultValue: 'hdfc',
    icon: (
      <Avatar
        variant="logo"
        size="sm"
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='16' height='16'%3E%3Crect width='24' height='24' fill='%23004c8f'/%3E%3Ctext x='12' y='16' text-anchor='middle' fill='white' font-family='sans-serif' font-size='10' font-weight='bold'%3EHD%3C/text%3E%3C/svg%3E"
      >
        HD
      </Avatar>
    ),
  },
};

export const MultiSelect: Story = {
  args: {
    label: 'Status flags',
    multiple: true,
    options: statusOptions,
    defaultValue: ['unreconciled', 'duplicate'],
  },
};

export const MultiWithSearch: Story = {
  args: {
    label: 'Categories',
    multiple: true,
    searchable: true,
    options: categoryOptions,
    defaultValue: ['food'],
  },
};

export const SectionedList: Story = {
  args: {
    label: 'Accounts',
    groups: sectionedGroups,
    defaultValue: 'regalia',
  },
};

export const WithAnActionRow: Story = {
  args: {
    label: 'Shared limit',
    options: sharedLimitOptions,
    defaultValue: 'hdfc_pool',
    actionRow: '+ New shared limit…',
  },
};

export const SearchCreateFromTyping: Story = {
  args: {
    label: 'Counterparty',
    searchable: true,
    options: counterpartyOptions,
    onCreate: () => {},
  },
};

export const NoResults: Story = {
  args: {
    label: 'Banks',
    searchable: true,
    searchValue: 'xyz bank',
    options: bankOptions,
  },
};

export const WithDescriptions: Story = {
  args: {
    label: 'Repayment options',
    showRadio: true,
    options: repaymentOptions,
    defaultValue: 'full',
  },
};

export const DisabledOption: Story = {
  args: {
    label: 'Transaction type',
    options: transferOptions,
    defaultValue: 'debit',
  },
};

export const CustomTrigger: Story = {
  render: (args) => {
    return (
      <Select
        {...args}
        options={[
          { value: 'account_1', label: 'HDFC Regalia Gold' },
          { value: 'account_2', label: 'Amex Platinum' },
          { value: 'account_3', label: 'SBI SimplyClick' },
        ]}
        defaultValue="account_1"
        trigger={
          <FilterChip active hasDropdown>
            Account · 2
          </FilterChip>
        }
      />
    );
  },
};

export const ClosedFieldStates: Story = {
  render: () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 p-space-16 bg-canvas rounded-ds-lg border border-line max-w-4xl">
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
          <Select options={categoryOptions} placeholder="Choose a category" />
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            With icon
          </span>
          <Select
            options={bankOptions}
            defaultValue="hdfc"
            icon={
              <Avatar
                variant="logo"
                size="sm"
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='16' height='16'%3E%3Crect width='24' height='24' fill='%23004c8f'/%3E%3Ctext x='12' y='16' text-anchor='middle' fill='white' font-family='sans-serif' font-size='10' font-weight='bold'%3EHD%3C/text%3E%3C/svg%3E"
              >
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
            Multi · overflow
          </span>
          <Select
            multiple
            options={[
              { value: 'food', label: 'Food & dining' },
              { value: 'groceries', label: 'Groceries' },
              { value: 'fuel', label: 'Fuel' },
              { value: 'travel', label: 'Travel' },
            ]}
            defaultValue={['food', 'groceries', 'fuel', 'travel']}
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
  },
};
