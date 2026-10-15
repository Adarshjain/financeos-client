import type { Meta, StoryObj } from '@storybook/react';

import { TextField } from './TextField';

const meta: Meta<typeof TextField> = {
  title: 'DS/Inputs/TextField',
  component: TextField,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    kind: {
      control: 'select',
      options: ['text', 'amount', 'password', 'number', 'email'],
    },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    defaultValue: { control: 'text' },
    helper: { control: 'text' },
    error: { control: 'text' },
    optional: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof TextField>;

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-space-24 max-w-lg font-text">
      <TextField
        label="Account name"
        defaultValue="HDFC Regalia Gold"
      />
      <TextField
        label="Total due"
        kind="amount"
        defaultValue="44,319.00"
      />
      <TextField
        label="Statement password"
        kind="password"
        defaultValue="Secret123"
      />
      <TextField
        label="MCC code"
        optional
        placeholder="e.g. 5812"
      />
      <TextField
        label="Last 4 digits"
        defaultValue="77"
        error="Enter the last 4 digits of the card."
      />
      <TextField
        label="Account"
        defaultValue="HDFC Regalia ••7741"
        disabled
      />
    </div>
  ),
};

export const Text: Story = {
  args: {
    label: 'Account name',
    defaultValue: 'HDFC Regalia Gold',
  },
};

export const Amount: Story = {
  args: {
    label: 'Total due',
    kind: 'amount',
    defaultValue: '44,319.00',
  },
};

export const Password: Story = {
  args: {
    label: 'Statement password',
    kind: 'password',
    defaultValue: 'Secret123',
  },
};

export const Placeholder: Story = {
  args: {
    label: 'MCC code',
    optional: true,
    placeholder: 'e.g. 5812',
  },
};

export const WithHelper: Story = {
  args: {
    label: 'Import emails from',
    placeholder: '01/04/2026',
    helper: 'Leave empty to pause Gmail import.',
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Last 4 digits',
    defaultValue: '77',
    error: 'Enter the last 4 digits of the card.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Account',
    defaultValue: 'HDFC Regalia ••7741',
    disabled: true,
  },
};
