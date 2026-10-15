import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Switch } from './Switch';

const meta = {
  title: 'DS/Inputs/Switch',
  component: Switch,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
  args: {
    defaultChecked: false,
  },
};

export const On: Story = {
  args: {
    defaultChecked: true,
  },
};

export const DisabledOff: Story = {
  args: {
    defaultChecked: false,
    disabled: true,
  },
};

export const DisabledOn: Story = {
  args: {
    defaultChecked: true,
    disabled: true,
  },
};

function ToggleRowInteractiveDemo() {
  const [checked, setChecked] = useState(false);
  return (
    <div className="max-w-md p-space-16 bg-surface rounded-ds-lg border border-line">
      <Switch
        label="Exclude from net worth"
        description="Hide this account from totals"
        checked={checked}
        onCheckedChange={setChecked}
      />
    </div>
  );
}

export const ToggleRowStory: Story = {
  name: 'ToggleRow',
  render: () => <ToggleRowInteractiveDemo />,
};

function ToggleRowOnInteractiveDemo() {
  const [checked, setChecked] = useState(true);
  return (
    <div className="max-w-md p-space-16 bg-surface rounded-ds-lg border border-line">
      <Switch
        label="Bill overdue"
        description="Daily after the due date"
        checked={checked}
        onCheckedChange={setChecked}
      />
    </div>
  );
}

export const ToggleRowOn: Story = {
  render: () => <ToggleRowOnInteractiveDemo />,
};

export const AllVariants: Story = {
  render: () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 p-space-16 max-w-2xl bg-canvas rounded-ds-lg border border-line">
        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Off
          </span>
          <div>
            <Switch defaultChecked={false} />
          </div>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            On
          </span>
          <div>
            <Switch defaultChecked={true} />
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
              defaultChecked={false}
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
              defaultChecked={true}
            />
          </div>
        </div>
      </div>
    );
  },
};
