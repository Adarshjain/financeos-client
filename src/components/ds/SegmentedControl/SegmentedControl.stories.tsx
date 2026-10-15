import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { useArgs } from 'storybook/preview-api';

import { SegmentedControl } from './SegmentedControl';

const meta: Meta<typeof SegmentedControl> = {
  title: 'DS/Inputs/SegmentedControl',
  component: SegmentedControl,
  parameters: {
    layout: 'padded',
  },
  args: {
    options: ['Debit', 'Credit'],
  },
  argTypes: {
    value: { control: 'text' },
    defaultValue: { control: 'text' },
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <SegmentedControl
        {...args}
        value={value ?? args.value}
        onValueChange={(val) => updateArgs({ value: val })}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => {
    const InteractiveAll = () => {
      const [v1, setV1] = useState('Debit');
      const [v2, setV2] = useState('Preset');
      const [v3, setV3] = useState('Calendar');
      const [v4, setV4] = useState('Part payment');
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 p-space-16 max-w-2xl bg-canvas rounded-ds-lg border border-line font-text">
          <div className="space-y-space-4">
            <span className="font-text text-caption font-semibold text-ink-3">
              Two options
            </span>
            <div>
              <SegmentedControl
                options={['Debit', 'Credit']}
                value={v1}
                onValueChange={setV1}
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
                value={v2}
                onValueChange={setV2}
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
                value={v3}
                onValueChange={setV3}
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
                value={v4}
                onValueChange={setV4}
              />
            </div>
          </div>
        </div>
      );
    };
    return <InteractiveAll />;
  },
};

export const TwoOptions: Story = {
  name: 'Two options',
  args: {
    options: ['Debit', 'Credit'],
    value: 'Debit',
  },
};

export const ThreeOptions: Story = {
  name: 'Three options',
  args: {
    options: ['Preset', 'Single date', 'Range'],
    value: 'Preset',
  },
};

export const ViewSwitch: Story = {
  name: 'View switch',
  args: {
    options: ['List', 'Calendar'],
    value: 'Calendar',
  },
};

export const InAForm: Story = {
  name: 'In a form',
  args: {
    options: ['Paid in full', 'Part payment'],
    value: 'Part payment',
  },
};
