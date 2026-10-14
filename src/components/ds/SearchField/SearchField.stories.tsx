import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { SearchField } from './SearchField';

const meta = {
  title: 'DS/Inputs/SearchField',
  component: SearchField,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    placeholder: 'Search merchant keys or names…',
  },
};

function TypingWithAClearXDemo() {
  const [val, setVal] = useState('swiggy');
  return (
    <div className="max-w-md">
      <SearchField
        value={val}
        placeholder="Search merchant keys or names…"
        onValueChange={setVal}
      />
    </div>
  );
}

export const TypingWithAClearX: Story = {
  render: () => <TypingWithAClearXDemo />,
};

export const LabelledInsideASheet: Story = {
  args: {
    variant: 'sheet',
    label: 'Find the other side',
    placeholder: 'Amount, merchant or date',
  },
};

export const NoResults: Story = {
  args: {
    defaultValue: 'xyz',
    placeholder: 'Search merchant keys or names…',
    helper: 'No transactions match "xyz".',
  },
};

export const AllVariants: Story = {
  render: () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 p-space-16 max-w-2xl bg-canvas rounded-ds-lg border border-line">
        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Empty
          </span>
          <SearchField placeholder="Search merchant keys or names…" />
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Typing · clear
          </span>
          <SearchField
            defaultValue="swiggy"
            placeholder="Search merchant keys or names…"
          />
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            In a sheet · labelled
          </span>
          <SearchField
            variant="sheet"
            label="Find the other side"
            placeholder="Amount, merchant or date"
          />
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            No results
          </span>
          <SearchField
            defaultValue="xyz"
            placeholder="Search merchant keys or names…"
            helper='No transactions match "xyz".'
          />
        </div>
      </div>
    );
  },
};
