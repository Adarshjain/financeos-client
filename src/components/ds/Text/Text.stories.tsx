import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Text } from '@/components/ds';

const meta: Meta<typeof Text> = {
  title: 'DS/Foundations/Text',
  component: Text,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Every piece of plain text on a page: titles, subtitles, body copy, helper lines, footers.',
      },
    },
  },
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
        'micro',
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
    variant: 'micro',
    children: 'Transactions',
  },
};

export const BodyDisplay: Story = {
  args: {
    variant: 'body',
    family: 'display',
    children: 'Display family body text',
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
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};
