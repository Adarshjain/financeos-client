import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import {
  Button,
  Card,
  CardEmpty,
  CardRow,
  CardSection,
  FilterChip,
  Icon,
  Pager,
  Text,
} from '@/components/ds';

const meta = {
  title: 'DS/Data display/Card',
  component: Card,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The one container for grouped information. Cards never cast a shadow; elevation comes from border-line on surface background.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    asChild: { control: 'boolean' },
    action: { control: false },
    children: { control: false },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TitleSubtitleLink: Story = {
  name: 'Title · subtitle · link',
  args: {
    title: 'Needs you',
    subtitle: 'Act now · 2',
    action: (
      <Button variant="link" size="sm" asChild>
        <a href="#inbox" className="inline-flex items-center gap-space-2">
          Inbox <Icon name="chevron-right" size="sm" />
        </a>
      </Button>
    ),
  },
};

export const WithAnAction: Story = {
  name: 'With an action',
  args: {
    title: 'Statements',
    subtitle: 'Each statement is a bill',
    action: <FilterChip hasDropdown>FY 26-27</FilterChip>,
  },
};

export const WithRows: Story = {
  name: 'With rows',
  args: {
    title: 'Next 14 days',
    children: (
      <>
        <CardRow>
          <Text truncate className="flex-1">Amex Platinum bill</Text>
          <Text variant="body-strong">₹33,900</Text>
        </CardRow>
        <CardRow>
          <Text truncate className="flex-1">Priya Nair · you owe</Text>
          <Text variant="body-strong">₹12,000</Text>
        </CardRow>
      </>
    ),
  },
};

export const WithAPager: StoryObj<{
  title?: string;
  subtitle?: string;
  page?: number;
  onPageChange?: (nextPage: number) => void;
}> = {
  name: 'With a pager',
  args: {
    title: 'Earning lines',
    page: 0,
    onPageChange: fn(),
  },
  render: function Render(args) {
    const [{ page = 0 }, updateArgs] = useArgs<{ page?: number }>();
    return (
      <Card title={args.title} subtitle={args.subtitle}>
        <CardRow>
          <Text truncate className="flex-1">IKEA India</Text>
          <Text variant="body-strong">196 pts</Text>
        </CardRow>
        <Pager
          page={page}
          size={25}
          totalElements={30}
          totalPages={2}
          onPageChange={(nextPage) => {
            updateArgs({ page: nextPage });
            args.onPageChange?.(nextPage);
          }}
        />
      </Card>
    );
  },
};

export const WithSectionBands: Story = {
  name: 'With section bands',
  args: {
    children: (
      <>
        <CardSection>Act now · 2</CardSection>
        <CardRow>
          <Text truncate className="flex-1">SBI statement missing</Text>
        </CardRow>
        <CardSection>Updates · 4</CardSection>
        <CardRow>
          <Text truncate className="flex-1">Prices refreshed</Text>
        </CardRow>
      </>
    ),
  },
};

export const Empty: Story = {
  name: 'Empty',
  args: {
    title: 'Untagged · 0',
    children: <CardEmpty>Every transaction has a category.</CardEmpty>,
  },
};
