import type { Meta, StoryObj } from '@storybook/react';

import { BankLogo } from '@/components/organisms';

const meta: Meta<typeof BankLogo> = {
  title: 'Organisms/BankLogo',
  component: BankLogo,
  parameters: { layout: 'padded' },
  args: { bankId: 'hdfc' },
  argTypes: { bankId: { control: 'text' } },
};

export default meta;
type Story = StoryObj<typeof BankLogo>;

export const Default: Story = {};

export const UnknownBank: Story = { args: { bankId: 'nope' } };
