import type { Meta, StoryObj } from '@storybook/react';
import { Check, ChevronDown } from 'lucide-react';
import React from 'react';

import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { Popover } from './Popover';

const SampleMenuContent: React.FC = () => (
  <div className="flex flex-col">
    <div className="flex items-center gap-space-10 min-h-control-lg px-space-10 rounded-ds-md font-text font-semibold text-body bg-brand-tint text-brand-strong cursor-pointer">
      <span>HDFC Regalia Gold</span>
      <span className="ml-auto text-brand-strong">
        <Icon icon={Check} size="md" />
      </span>
    </div>
    <div className="flex items-center gap-space-10 min-h-control-lg px-space-10 rounded-ds-md font-text font-semibold text-body text-ink hover:bg-hover cursor-pointer">
      <span>Amex Platinum</span>
    </div>
    <div className="flex items-center gap-space-10 min-h-control-lg px-space-10 rounded-ds-md font-text font-semibold text-body text-ink hover:bg-hover cursor-pointer">
      <span>SBI SimplyClick</span>
    </div>
  </div>
);

const meta: Meta<typeof Popover> = {
  title: 'DS/Overlays/Popover',
  component: Popover,
  argTypes: {
    width: {
      control: { type: 'select' },
      options: ['match', 'content'],
      description: 'Whether popover matches trigger width or fits content (min trigger width)',
    },
    align: {
      control: { type: 'select' },
      options: ['start', 'center', 'end'],
    },
    side: {
      control: { type: 'select' },
      options: ['top', 'bottom', 'left', 'right'],
    },
  },
  args: {
    width: 'match',
    align: 'start',
    side: 'bottom',
  },
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-space-24 p-space-16 max-w-lg">
      <div className="flex flex-col gap-space-8">
        <span className="font-text text-overline font-extrabold uppercase text-ink-4">
          Match trigger width
        </span>
        <Popover
          width="match"
          defaultOpen
          trigger={
            <Button variant="secondary" className="w-72 justify-between">
              <span>HDFC Regalia Gold</span>
              <Icon icon={ChevronDown} size="md" />
            </Button>
          }
        >
          <SampleMenuContent />
        </Popover>
      </div>

      <div className="flex flex-col gap-space-8 pt-space-48">
        <span className="font-text text-overline font-extrabold uppercase text-ink-4">
          Content width
        </span>
        <Popover
          width="content"
          defaultOpen
          trigger={
            <Button variant="secondary" className="gap-space-8">
              <span>Account</span>
              <Icon icon={ChevronDown} size="md" />
            </Button>
          }
        >
          <SampleMenuContent />
        </Popover>
      </div>
    </div>
  ),
};

export const MatchTriggerWidth: Story = {
  args: {
    width: 'match',
    defaultOpen: true,
    trigger: (
      <Button variant="secondary" className="w-72 justify-between">
        <span>HDFC Regalia Gold</span>
        <Icon icon={ChevronDown} size="md" />
      </Button>
    ),
    children: <SampleMenuContent />,
  },
};

export const ContentWidth: Story = {
  args: {
    width: 'content',
    defaultOpen: true,
    trigger: (
      <Button variant="secondary" className="gap-space-8">
        <span>Options</span>
        <Icon icon={ChevronDown} size="md" />
      </Button>
    ),
    children: <SampleMenuContent />,
  },
};
