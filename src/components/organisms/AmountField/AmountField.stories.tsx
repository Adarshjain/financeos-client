import type { Meta, StoryObj } from '@storybook/react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { AmountField } from '@/components/organisms';
import { amountExpressionProps } from '@/lib/amountExpression';

const meta: Meta<typeof AmountField> = {
  title: 'Organisms/AmountField',
  component: AmountField,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'An amount TextField. On desktop a plain input that also takes arithmetic (120+80). On phone, tapping it opens a keypad sheet with the amount and Apply instead of the OS keyboard.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md w-full">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    prefix: { control: 'text' },
    helper: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    size: { control: 'select', options: ['md', 'lg', 'xl'] },
    value: { control: 'text' },
    onValueChange: { control: false },
    onNegative: { control: false },
  },
  args: {
    label: 'Amount',
    prefix: '₹',
    inputMode: 'decimal',
    onValueChange: fn(),
    onNegative: fn(),
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    const current = String(value ?? '');
    const expression = amountExpressionProps(current, (next) => updateArgs({ value: next }));
    return (
      <AmountField
        {...args}
        value={current}
        onValueChange={(v) => {
          args.onValueChange?.(v);
          expression.onValueChange(v);
        }}
        onBlur={expression.onBlur}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof AmountField>;

export const Empty: Story = {
  args: { placeholder: '0.00' },
};

export const Filled: Story = {
  args: { value: '44,319.00' },
};

export const Expression: Story = {
  args: { value: '1200+345.50', helper: 'Resolves to 1,545.50 when you leave the field' },
};

export const WithError: Story = {
  args: { value: '0', error: 'Enter an amount above zero' },
};

export const Disabled: Story = {
  args: { value: '44,319.00', disabled: true },
};
