import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { ChoiceCard } from '@/components/ds';

const meta: Meta<typeof ChoiceCard.Group> = {
  title: 'DS/Form fields/ChoiceCard',
  component: ChoiceCard.Group,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A selectable tile for picking one item from a set of rich options, such as the dashboard widget picker. The page passes every word, including the meta line.',
      },
    },
  },
  args: {
    value: 'utilisation',
    onValueChange: fn(),
    className: 'grid-cols-1 desk:grid-cols-3 max-w-container-xl',
  },
  argTypes: {
    value: { control: 'text' },
    defaultValue: { control: false },
    className: { control: 'text' },
    onValueChange: { control: false },
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <ChoiceCard.Group
        {...args}
        value={value}
        onValueChange={(v) => {
          args.onValueChange?.(v);
          updateArgs({ value: v });
        }}
      >
        <ChoiceCard
          value="utilisation"
          title="Card utilisation"
          description="How much of each credit limit is in use."
        />
        <ChoiceCard value="bills" title="Bills due" description="What falls due in the next 7 days." />
        <ChoiceCard value="net-worth" title="Net worth" description="Assets minus loans, month by month." />
      </ChoiceCard.Group>
    );
  },
};

export default meta;
type Story = StoryObj<typeof ChoiceCard.Group>;

export const Default: Story = { args: { value: '' } };

export const Selected: Story = { args: { value: 'bills' } };

export const WithMeta: Story = {
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <ChoiceCard.Group
        {...args}
        value={value}
        onValueChange={(v) => {
          args.onValueChange?.(v);
          updateArgs({ value: v });
        }}
      >
        <ChoiceCard
          value="utilisation"
          title="Card utilisation"
          description="How much of each credit limit is in use."
          meta="Selected · Half width · needs: card"
        />
        <ChoiceCard
          value="bills"
          title="Bills due"
          description="What falls due in the next 7 days."
          meta="Half width"
        />
        <ChoiceCard
          value="net-worth"
          title="Net worth"
          description="Assets minus loans, month by month."
          meta="Full width · needs: account"
        />
      </ChoiceCard.Group>
    );
  },
};

export const Disabled: Story = {
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <ChoiceCard.Group
        {...args}
        value={value}
        onValueChange={(v) => {
          args.onValueChange?.(v);
          updateArgs({ value: v });
        }}
      >
        <ChoiceCard value="utilisation" title="Card utilisation" description="How much of each credit limit is in use." />
        <ChoiceCard
          value="rewards"
          title="Rewards earned"
          description="Points and cashback this month."
          meta="Needs: a reward card"
          disabled
        />
        <ChoiceCard value="bills" title="Bills due" description="What falls due in the next 7 days." />
      </ChoiceCard.Group>
    );
  },
};
