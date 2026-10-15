import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { useArgs } from 'storybook/preview-api';

import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'DS/Inputs/Checkbox',
  component: Checkbox,
  argTypes: {
    checked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    indeterminate: {
      control: 'boolean',
    },
  },
  render: function Render(args) {
    const [{ checked }, updateArgs] = useArgs();
    return (
      <Checkbox
        {...args}
        checked={checked}
        onCheckedChange={(val) => updateArgs({ checked: val })}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const AllVariants: Story = {
  render: () => {
    const InteractiveRow = () => {
      const [c1, setC1] = useState<boolean | 'indeterminate'>(false);
      const [c2, setC2] = useState<boolean | 'indeterminate'>(true);
      const [c3, setC3] = useState<boolean | 'indeterminate'>('indeterminate');
      return (
        <div className="p-space-16 bg-canvas min-h-full flex flex-col gap-space-12 font-text">
          <div className="flex gap-space-16 items-center">
            <Checkbox checked={c1} onCheckedChange={setC1} aria-label="Off" />
            <Checkbox checked={c2} onCheckedChange={setC2} aria-label="On" />
            <Checkbox checked={c3} onCheckedChange={setC3} aria-label="Mixed" />
            <Checkbox disabled aria-label="Disabled" />
          </div>
        </div>
      );
    };
    return <InteractiveRow />;
  },
};

export const Off: Story = {
  args: {
    checked: false,
    'aria-label': 'Off',
  },
};

export const On: Story = {
  args: {
    checked: true,
    'aria-label': 'On',
  },
};

export const Mixed: Story = {
  args: {
    checked: 'indeterminate',
    'aria-label': 'Mixed',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    'aria-label': 'Disabled',
  },
};
