import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { SegmentedControl } from './SegmentedControl';

const meta = {
  title: 'DS/Inputs/SegmentedControl',
  component: SegmentedControl,
  parameters: {
    layout: 'padded',
  },
  args: {
    options: ['Debit', 'Credit'],
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

function TwoOptionsInteractive() {
  const [val, setVal] = useState('Debit');
  return (
    <SegmentedControl
      options={['Debit', 'Credit']}
      value={val}
      onChange={setVal}
    />
  );
}

export const TwoOptions: Story = {
  render: () => <TwoOptionsInteractive />,
};

function ThreeOptionsInteractive() {
  const [val, setVal] = useState('Preset');
  return (
    <SegmentedControl
      options={['Preset', 'Single date', 'Range']}
      value={val}
      onChange={setVal}
    />
  );
}

export const ThreeOptions: Story = {
  render: () => <ThreeOptionsInteractive />,
};

function ViewSwitchInteractive() {
  const [val, setVal] = useState('Calendar');
  return (
    <SegmentedControl
      options={['List', 'Calendar']}
      value={val}
      onChange={setVal}
    />
  );
}

export const ViewSwitch: Story = {
  render: () => <ViewSwitchInteractive />,
};

function InAFormInteractive() {
  const [val, setVal] = useState('Part payment');
  return (
    <SegmentedControl
      options={['Paid in full', 'Part payment']}
      value={val}
      onChange={setVal}
    />
  );
}

export const InAForm: Story = {
  render: () => <InAFormInteractive />,
};

export const FullWidth: Story = {
  render: () => {
    return (
      <div className="max-w-md">
        <SegmentedControl
          fullWidth
          options={['Debit', 'Credit']}
          defaultValue="Debit"
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => {
    return (
      <div className="space-y-space-12">
        <div>
          <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
            Whole control disabled
          </span>
          <SegmentedControl
            disabled
            options={['Debit', 'Credit']}
            defaultValue="Debit"
          />
        </div>
        <div>
          <span className="font-text text-caption font-semibold text-ink-3 block mb-space-4">
            Single option disabled
          </span>
          <SegmentedControl
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived', disabled: true },
            ]}
            defaultValue="all"
          />
        </div>
      </div>
    );
  },
};

export const AllVariants: Story = {
  render: () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 p-space-16 max-w-2xl bg-canvas rounded-ds-lg border border-line">
        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Two options
          </span>
          <div>
            <SegmentedControl
              options={['Debit', 'Credit']}
              defaultValue="Debit"
            />
          </div>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Three options
          </span>
          <div>
            <SegmentedControl
              options={['Preset', 'Single date', 'Range']}
              defaultValue="Preset"
            />
          </div>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            View switch
          </span>
          <div>
            <SegmentedControl
              options={['List', 'Calendar']}
              defaultValue="Calendar"
            />
          </div>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            In a form
          </span>
          <div>
            <SegmentedControl
              options={['Paid in full', 'Part payment']}
              defaultValue="Part payment"
            />
          </div>
        </div>
      </div>
    );
  },
};
