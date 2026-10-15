import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { useArgs } from 'storybook/preview-api';

import { Switch } from './Switch';

const meta = {
  title: 'DS/Inputs/Switch',
  component: Switch,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    description: { control: 'text' },
  },
  render: function Render(args) {
    const [{ checked }, updateArgs] = useArgs();
    return (
      <Switch
        {...args}
        checked={checked ?? args.checked}
        onCheckedChange={(val) => updateArgs({ checked: val })}
      />
    );
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => {
    const InteractiveAll = () => {
      const [c1, setC1] = useState(false);
      const [c2, setC2] = useState(true);
      const [c3, setC3] = useState(false);
      const [c4, setC4] = useState(true);
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 p-space-16 max-w-2xl bg-canvas rounded-ds-lg border border-line font-text">
          <div className="space-y-space-4">
            <span className="font-text text-caption font-semibold text-ink-3">
              Off
            </span>
            <div>
              <Switch checked={c1} onCheckedChange={setC1} />
            </div>
          </div>

          <div className="space-y-space-4">
            <span className="font-text text-caption font-semibold text-ink-3">
              On
            </span>
            <div>
              <Switch checked={c2} onCheckedChange={setC2} />
            </div>
          </div>

          <div className="space-y-space-4">
            <span className="font-text text-caption font-semibold text-ink-3">
              Disabled off
            </span>
            <div>
              <Switch defaultChecked={false} disabled />
            </div>
          </div>

          <div className="space-y-space-4">
            <span className="font-text text-caption font-semibold text-ink-3">
              Disabled on
            </span>
            <div>
              <Switch defaultChecked={true} disabled />
            </div>
          </div>

          <div className="space-y-space-4 col-span-1 md:col-span-2">
            <span className="font-text text-caption font-semibold text-ink-3">
              Toggle row
            </span>
            <div className="bg-surface p-space-12 rounded-ds-md border border-line">
              <Switch
                label="Exclude from net worth"
                description="Hide this account from totals"
                checked={c3}
                onCheckedChange={setC3}
              />
            </div>
          </div>

          <div className="space-y-space-4 col-span-1 md:col-span-2">
            <span className="font-text text-caption font-semibold text-ink-3">
              Toggle row · on
            </span>
            <div className="bg-surface p-space-12 rounded-ds-md border border-line">
              <Switch
                label="Bill overdue"
                description="Daily after the due date"
                checked={c4}
                onCheckedChange={setC4}
              />
            </div>
          </div>
        </div>
      );
    };
    return <InteractiveAll />;
  },
};

export const Off: Story = {
  args: {
    checked: false,
  },
};

export const On: Story = {
  args: {
    checked: true,
  },
};

export const DisabledOff: Story = {
  args: {
    checked: false,
    disabled: true,
  },
};

export const DisabledOn: Story = {
  args: {
    checked: true,
    disabled: true,
  },
};

export const ToggleRowStory: Story = {
  name: 'ToggleRow',
  args: {
    checked: false,
    label: 'Exclude from net worth',
    description: 'Hide this account from totals',
  },
  render: function Render(args) {
    const [{ checked }, updateArgs] = useArgs();
    return (
      <div className="max-w-md p-space-16 bg-surface rounded-ds-lg border border-line font-text">
        <Switch
          {...args}
          checked={checked ?? args.checked}
          onCheckedChange={(val) => updateArgs({ checked: val })}
        />
      </div>
    );
  },
};

export const ToggleRowOn: Story = {
  name: 'ToggleRow · on',
  args: {
    checked: true,
    label: 'Bill overdue',
    description: 'Daily after the due date',
  },
  render: function Render(args) {
    const [{ checked }, updateArgs] = useArgs();
    return (
      <div className="max-w-md p-space-16 bg-surface rounded-ds-lg border border-line font-text">
        <Switch
          {...args}
          checked={checked ?? args.checked}
          onCheckedChange={(val) => updateArgs({ checked: val })}
        />
      </div>
    );
  },
};
