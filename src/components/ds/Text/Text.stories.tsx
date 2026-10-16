import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Text } from './Text';

const meta: Meta<typeof Text> = {
  title: 'DS/Foundations/Text',
  component: Text,
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'hero-figure',
        'page-title',
        'screen-title',
        'figure',
        'title',
        'heading',
        'body',
        'body-strong',
        'label',
        'caption',
        'overline',
        'tab-label',
      ],
    },
    tone: {
      control: 'select',
      options: ['ink', 'ink-2', 'ink-3', 'ink-4', 'positive', 'danger', 'warning', 'info'],
    },
    as: {
      control: 'text',
    },
    family: {
      control: 'radio',
      options: ['text', 'display'],
    },
    align: {
      control: 'radio',
      options: ['start', 'center', 'end'],
    },
    truncate: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Text>;

export const AllVariants: Story = {
  render: () => (
    <div className="p-space-16 bg-canvas min-h-full flex flex-col gap-space-12 font-text max-w-xl">
      <div className="py-space-6 border-b border-line-soft">
        <div className="text-caption text-ink-4 font-mono mb-space-2">page-title · display</div>
        <Text variant="page-title" family="display">Sign in</Text>
      </div>
      <div className="flex items-baseline gap-space-16 py-space-6 border-b border-line-soft">
        <span className="w-28 text-caption text-ink-4 font-mono">page-title</span>
        <Text variant="page-title">Create your account</Text>
      </div>
      <div className="flex items-baseline gap-space-16 py-space-6 border-b border-line-soft">
        <span className="w-28 text-caption text-ink-4 font-mono">screen-title</span>
        <Text variant="screen-title">HDFC Regalia Gold</Text>
      </div>
      <div className="flex items-baseline gap-space-16 py-space-6 border-b border-line-soft">
        <span className="w-28 text-caption text-ink-4 font-mono">title</span>
        <Text variant="title">Needs you</Text>
      </div>
      <div className="flex items-baseline gap-space-16 py-space-6 border-b border-line-soft">
        <span className="w-28 text-caption text-ink-4 font-mono">heading</span>
        <Text variant="heading">Statements</Text>
      </div>
      <div className="flex items-baseline gap-space-16 py-space-6 border-b border-line-soft">
        <span className="w-28 text-caption text-ink-4 font-mono">body</span>
        <Text variant="body">You will need an invite code.</Text>
      </div>
      <div className="flex items-baseline gap-space-16 py-space-6 border-b border-line-soft">
        <span className="w-28 text-caption text-ink-4 font-mono">body-strong</span>
        <Text variant="body-strong">₹44,319 due on 25 Oct</Text>
      </div>
      <div className="flex items-baseline gap-space-16 py-space-6 border-b border-line-soft">
        <span className="w-28 text-caption text-ink-4 font-mono">label</span>
        <Text variant="label">Email</Text>
      </div>
      <div className="flex items-baseline gap-space-16 py-space-6 border-b border-line-soft">
        <span className="w-28 text-caption text-ink-4 font-mono">caption</span>
        <Text variant="caption">By continuing you agree to the terms.</Text>
      </div>
      <div className="flex items-baseline gap-space-16 py-space-6 border-b border-line-soft">
        <span className="w-28 text-caption text-ink-4 font-mono">overline</span>
        <Text variant="overline">Money</Text>
      </div>
      <div className="flex gap-space-14 flex-wrap mt-space-12 font-semibold">
        <Text tone="ink">ink</Text>
        <Text tone="ink-2">ink-2</Text>
        <Text tone="ink-3">ink-3</Text>
        <Text tone="ink-4">ink-4</Text>
        <Text tone="positive">positive</Text>
        <Text tone="danger">danger</Text>
        <Text tone="warning">warning</Text>
        <Text tone="info">info</Text>
      </div>
    </div>
  ),
};

export const HeroFigure: Story = {
  args: {
    variant: 'hero-figure',
    family: 'display',
    children: '₹11,98,842',
  },
};

export const PageTitle: Story = {
  args: {
    variant: 'page-title',
    family: 'display',
    children: 'Sign in',
  },
};

export const ScreenTitle: Story = {
  args: {
    variant: 'screen-title',
    children: 'HDFC Regalia Gold',
  },
};

export const Figure: Story = {
  args: {
    variant: 'figure',
    children: '₹4,12,050',
  },
};

export const Title: Story = {
  args: {
    variant: 'title',
    children: 'Needs you',
  },
};

export const Heading: Story = {
  args: {
    variant: 'heading',
    children: 'Statements',
  },
};

export const Body: Story = {
  args: {
    variant: 'body',
    children: 'You will need an invite code.',
  },
};

export const BodyStrong: Story = {
  args: {
    variant: 'body-strong',
    children: '₹44,319 due on 25 Oct',
  },
};

export const Label: Story = {
  args: {
    variant: 'label',
    children: 'Email',
  },
};

export const Caption: Story = {
  args: {
    variant: 'caption',
    children: 'By continuing you agree to the terms.',
  },
};

export const Overline: Story = {
  args: {
    variant: 'overline',
    children: 'Money',
  },
};

export const TabLabel: Story = {
  args: {
    variant: 'tab-label',
    children: 'Transactions',
  },
};

export const DisplayFamily: Story = {
  args: {
    variant: 'page-title',
    family: 'display',
    children: 'Welcome to FinanceOS',
  },
};

export const Centered: Story = {
  args: {
    variant: 'label',
    tone: 'ink-3',
    align: 'center',
    children: 'Already have an account? Sign in',
  },
};

export const Truncated: Story = {
  args: {
    variant: 'body',
    truncate: true,
    children: 'This is a long line of text that should truncate with an ellipsis when there is not enough space.',
  },
  render: (args) => (
    <div className="w-64 border border-line-soft p-space-8">
      <Text {...args} />
    </div>
  ),
};
