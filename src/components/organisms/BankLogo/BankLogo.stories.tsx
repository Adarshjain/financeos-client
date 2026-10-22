import type { Meta, StoryObj } from '@storybook/react';

import { BankLogo } from '@/components/organisms';

const meta: Meta<typeof BankLogo> = {
  title: 'Organisms/BankLogo',
  component: BankLogo,
  parameters: { layout: 'padded' },
  args: { bankId: 'hdfc', name: 'Salary' },
  argTypes: { bankId: { control: 'text' } },
};

export default meta;
type Story = StoryObj<typeof BankLogo>;

export const Default: Story = {};

export const UnknownBank: Story = { args: { bankId: 'nope', name: 'Nova' } };

export const NoBankNoWarning: Story = { args: { bankId: null, name: 'Cash wallet', warning: false } };

export const NoBank: Story = { args: { bankId: null, name: 'Cash wallet' } };
