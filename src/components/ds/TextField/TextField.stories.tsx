import type { Meta, StoryObj } from '@storybook/react';
import { Calendar } from 'lucide-react';

import { ReadOnlyRow, TextField } from './TextField';

const meta: Meta<typeof TextField> = {
  title: 'DS/Inputs/TextField',
  component: TextField,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof TextField>;

export const Default: Story = {
  args: {
    label: 'Account name',
    defaultValue: 'HDFC Regalia Gold',
  },
};

export const Placeholder: Story = {
  args: {
    label: 'Description',
    optional: true,
    placeholder: 'e.g. Primary card',
  },
};

export const Focused: Story = {
  args: {
    label: 'Pattern',
    defaultValue: 'SWIGGY',
  },
};

export const WithHelper: Story = {
  args: {
    label: 'Import emails from',
    defaultValue: '01/04/2026',
    helper: 'Leave empty to pause Gmail import.',
  },
};

export const Error: Story = {
  args: {
    label: 'Last 4 digits',
    defaultValue: '77',
    error: 'Enter the last 4 digits of the card.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Email',
    defaultValue: 'arjun@example.com',
    disabled: true,
  },
};

export const Locked: Story = {
  args: {
    label: 'Account',
    defaultValue: 'HDFC Regalia Gold ••7741',
    locked: true,
  },
};

export const AmountWithPrefix: Story = {
  args: {
    label: 'Amount paid',
    prefix: '₹',
    defaultValue: '44,319.00',
  },
};

export const PasswordWithToggle: Story = {
  args: {
    label: 'Statement password',
    type: 'password',
    defaultValue: 'Secret123',
  },
};

export const DateInput: Story = {
  args: {
    label: 'Paid on',
    defaultValue: '13/10/2026',
    suffix: <Calendar className="h-space-14 w-space-14" />,
  },
};

export const MultiLine: Story = {
  args: {
    label: 'Note',
    optional: true,
    multiline: true,
    rows: 3,
    placeholder: 'e.g. returned the TV',
  },
};

export const ReadOnly: Story = {
  render: () => (
    <div className="max-w-md p-space-12 rounded-ds-lg border border-line bg-surface">
      <ReadOnlyRow label="Source" value="Statement · Regalia-Oct.pdf" />
      <ReadOnlyRow label="Account" value="HDFC Regalia Gold ••7741" />
      <ReadOnlyRow label="Status" value="Reconciled" />
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-space-24 max-w-lg font-text">
      <TextField
        label="Account name"
        defaultValue="HDFC Regalia Gold"
      />
      <TextField
        label="Description"
        optional
        placeholder="e.g. Primary card"
      />
      <TextField
        label="Import emails from"
        defaultValue="01/04/2026"
        helper="Leave empty to pause Gmail import."
      />
      <TextField
        label="Last 4 digits"
        defaultValue="77"
        error="Enter the last 4 digits of the card."
      />
      <TextField
        label="Email"
        defaultValue="arjun@example.com"
        disabled
      />
      <TextField
        label="Account"
        defaultValue="HDFC Regalia Gold ••7741"
        locked
      />
      <TextField
        label="Amount paid"
        prefix="₹"
        defaultValue="44,319.00"
      />
      <TextField
        label="Statement password"
        type="password"
        defaultValue="Secret123"
      />
      <TextField
        label="Paid on"
        defaultValue="13/10/2026"
        suffix={<Calendar className="h-space-14 w-space-14" />}
      />
      <TextField
        label="Note"
        optional
        multiline
        placeholder="e.g. returned the TV"
      />
      <div className="p-space-12 rounded-ds-lg border border-line bg-surface">
        <ReadOnlyRow label="Source" value="Statement · Regalia-Oct.pdf" />
      </div>
    </div>
  ),
};
