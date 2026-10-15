import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Select } from '../Select/Select';
import { FilterChip, FilterChipRow } from './FilterChip';

const meta: Meta<typeof FilterChip> = {
  title: 'DS/Inputs/FilterChip',
  component: FilterChip,
  argTypes: {
    active: { control: { type: 'boolean' } },
    variant: {
      control: { type: 'select' },
      options: ['default', 'amber', 'more'],
    },
    hasDropdown: { control: { type: 'boolean' } },
    removable: { control: { type: 'boolean' } },
    count: { control: { type: 'number' } },
    disabled: { control: { type: 'boolean' } },
  },
  args: {
    children: 'Category',
  },
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof FilterChip>;

export const AllVariants: Story = {
  render: () => {
    return (
      <div className="space-y-space-24 max-w-4xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-16 p-space-16 bg-canvas rounded-ds-lg border border-line">
          <div className="space-y-space-4">
            <span className="font-text text-overline font-extrabold uppercase text-ink-4">
              Toggle off
            </span>
            <div>
              <FilterChip>Up to statement</FilterChip>
            </div>
          </div>

          <div className="space-y-space-4">
            <span className="font-text text-overline font-extrabold uppercase text-ink-4">
              Toggle on
            </span>
            <div>
              <FilterChip active>All · 64</FilterChip>
            </div>
          </div>

          <div className="space-y-space-4">
            <span className="font-text text-overline font-extrabold uppercase text-ink-4">
              Dropdown
            </span>
            <div>
              <FilterChip hasDropdown>Category</FilterChip>
            </div>
          </div>

          <div className="space-y-space-4">
            <span className="font-text text-overline font-extrabold uppercase text-ink-4">
              Dropdown with value
            </span>
            <div>
              <FilterChip active hasDropdown>
                Account · 2
              </FilterChip>
            </div>
          </div>

          <div className="space-y-space-4">
            <span className="font-text text-overline font-extrabold uppercase text-ink-4">
              With count
            </span>
            <div>
              <FilterChip count={3}>Category</FilterChip>
            </div>
          </div>

          <div className="space-y-space-4">
            <span className="font-text text-overline font-extrabold uppercase text-ink-4">
              Removable
            </span>
            <div>
              <FilterChip active removable>
                This year
              </FilterChip>
            </div>
          </div>

          <div className="space-y-space-4">
            <span className="font-text text-overline font-extrabold uppercase text-ink-4">
              Review (on)
            </span>
            <div>
              <FilterChip variant="amber" active removable>
                Needs review · 25
              </FilterChip>
            </div>
          </div>

          <div className="space-y-space-4">
            <span className="font-text text-overline font-extrabold uppercase text-ink-4">
              More filters
            </span>
            <div>
              <FilterChip variant="more">+ More</FilterChip>
            </div>
          </div>
        </div>

        <div className="p-space-16 bg-canvas rounded-ds-lg border border-line space-y-space-8">
          <span className="font-text text-caption font-semibold text-ink-3 block">
            Dropdown chip open: Select with FilterChip as trigger
          </span>
          <Select
            options={[
              { value: 'regalia', label: 'HDFC Regalia Gold' },
              { value: 'amex', label: 'Amex Platinum' },
              { value: 'sbi', label: 'SBI SimplyClick' },
            ]}
            defaultValue={['regalia', 'amex']}
            multiple
            searchable
            searchPlaceholder="Search accounts"
            trigger={
              <FilterChip active hasDropdown>
                Account · 2
              </FilterChip>
            }
          />
        </div>
      </div>
    );
  },
};

export const Off: Story = {
  args: {
    children: 'Category',
    hasDropdown: true,
    active: false,
  },
};

export const On: Story = {
  args: {
    children: 'All · 64',
    active: true,
  },
};

export const OnWithValue: Story = {
  args: {
    children: 'Account · 2',
    active: true,
    hasDropdown: true,
  },
};

export const Dropdown: Story = {
  args: {
    children: 'Category',
    hasDropdown: true,
  },
};

export const WithCount: Story = {
  args: {
    children: 'Category',
    count: 3,
    active: false,
  },
};

export const Removable: Story = {
  args: {
    children: 'This year',
    active: true,
    removable: true,
  },
};

export const ReviewOn: Story = {
  args: {
    children: 'Needs review · 25',
    variant: 'amber',
    active: true,
    removable: true,
  },
};

export const Toggle: Story = {
  args: {
    children: 'Up to statement',
    active: false,
  },
};

export const MoreFilters: Story = {
  args: {
    children: '+ More',
    variant: 'more',
  },
};

export const DropdownWithSelect: Story = {
  render: () => (
    <Select
      options={[
        { value: 'regalia', label: 'HDFC Regalia Gold' },
        { value: 'amex', label: 'Amex Platinum' },
        { value: 'sbi', label: 'SBI SimplyClick' },
      ]}
      defaultValue={['regalia', 'amex']}
      multiple
      searchable
      searchPlaceholder="Search accounts"
      trigger={
        <FilterChip active hasDropdown>
          Account · 2
        </FilterChip>
      }
    />
  ),
};

function FilterRowDemo() {
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [reviewActive, setReviewActive] = useState(true);
  const [upToStmt, setUpToStmt] = useState(false);

  return (
    <div className="max-w-2xl bg-canvas p-space-16 rounded-ds-lg border border-line">
      <FilterChipRow>
        {reviewActive ? (
          <FilterChip
            variant="amber"
            active
            removable
            onRemove={() => setReviewActive(false)}
          >
            Needs review · 25
          </FilterChip>
        ) : null}

        {['All', 'Unverified', 'Verified'].map((status) => (
          <FilterChip
            key={status}
            active={selectedStatus === status}
            onClick={() => setSelectedStatus(status)}
          >
            {status}
          </FilterChip>
        ))}

        <FilterChip
          active={upToStmt}
          onClick={() => setUpToStmt(!upToStmt)}
        >
          Up to statement
        </FilterChip>

        <FilterChip hasDropdown count={3}>
          Category
        </FilterChip>

        <FilterChip active hasDropdown>
          Account · 2
        </FilterChip>

        <FilterChip variant="more">+ More</FilterChip>
      </FilterChipRow>
    </div>
  );
}

export const FilterRow: Story = {
  render: () => <FilterRowDemo />,
};
