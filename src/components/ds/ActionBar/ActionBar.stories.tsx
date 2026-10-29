import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { ActionBar, Button, Menu } from '@/components/ds';

const meta: Meta<typeof ActionBar> = {
  title: 'DS/Navigation/ActionBar',
  component: ActionBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The row under a detail page Hero: one short fact on the left, the page actions and an optional ⋮ menu on the right. One row at every width, vertically centred.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-container-md">
        <Story />
      </div>
    ),
  ],
  argTypes: { info: { control: 'text' }, actions: { control: false }, menu: { control: false } },
};

export default meta;
type Story = StoryObj<typeof ActionBar>;

const menu = (
  <>
    <Menu.Item onSelect={fn()}>Edit</Menu.Item>
    <Menu.Item onSelect={fn()}>Delete</Menu.Item>
  </>
);

export const Default: Story = {
  args: { info: 'Stock · NSE', actions: <Button variant="primary">Record trade</Button>, menu },
};

export const ActionsOnly: Story = { args: { actions: <Button variant="primary">Edit</Button> } };

export const InfoOnly: Story = { args: { info: 'Closed' } };

export const LongInfo: Story = {
  args: {
    info: 'A very long note about this person that goes on and on and will not fit on a phone-width row at all',
    actions: <Button variant="primary">Settle up</Button>,
    menu,
  },
};
