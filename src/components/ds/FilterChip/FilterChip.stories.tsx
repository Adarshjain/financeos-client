import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { FilterChip, FilterChipRow } from './FilterChip';

const meta = {
  title: 'DS/Inputs/FilterChip',
  component: FilterChip,
  parameters: {
    layout: 'padded',
  },
  args: {
    children: 'Filter',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FilterChip>;

export default meta;
type Story = StoryObj<typeof meta>;

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

export const WithValue: Story = {
  args: {
    children: 'Account · 2',
    active: true,
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

        <FilterChip
          active={selectedStatus === 'All'}
          onClick={() => setSelectedStatus('All')}
        >
          All · 64
        </FilterChip>

        <FilterChip
          active={selectedStatus === 'Unverified'}
          onClick={() => setSelectedStatus('Unverified')}
        >
          Unverified · 18
        </FilterChip>

        <FilterChip
          active={selectedStatus === 'Verified'}
          onClick={() => setSelectedStatus('Verified')}
        >
          Verified
        </FilterChip>

        <FilterChip hasDropdown count={2} active>
          Category
        </FilterChip>

        <FilterChip hasDropdown>Account</FilterChip>

        <FilterChip
          active={upToStmt}
          onClick={() => setUpToStmt(!upToStmt)}
        >
          Up to statement
        </FilterChip>

        <FilterChip variant="more">+ More</FilterChip>
      </FilterChipRow>
    </div>
  );
}

export const FilterRow: Story = {
  render: () => <FilterRowDemo />,
};

export const AllVariants: Story = {
  render: () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-16 p-space-16 max-w-2xl bg-canvas rounded-ds-lg border border-line">
        <div className="space-y-space-4">
          <span className="font-text text-overline font-extrabold uppercase text-ink-4">
            Off
          </span>
          <div>
            <FilterChip hasDropdown>Category</FilterChip>
          </div>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-overline font-extrabold uppercase text-ink-4">
            On
          </span>
          <div>
            <FilterChip active>All · 64</FilterChip>
          </div>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-overline font-extrabold uppercase text-ink-4">
            With value
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
            Toggle
          </span>
          <div>
            <FilterChip>Up to statement</FilterChip>
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
    );
  },
};
