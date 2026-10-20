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
    variant: { control: 'inline-radio', options: ['default', 'inset'] },
    tone: { control: 'inline-radio', options: ['neutral', 'danger'] },
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

export const Inset: Story = {
  args: {
    title: 'Recent sync jobs',
    subtitle: 'Last 7 days',
    children: (
      <div className="px-space-16 pb-space-16">
        <Card variant="inset" title="Gmail sync" subtitle="Today, 06:00 · 2m 14s">
          <div className="grid grid-cols-3 gap-space-8 px-space-10 pb-space-10">
            {[
              ['Parsed', '42'],
              ['Skipped', '7'],
              ['Failed', '1'],
            ].map(([label, count]) => (
              <Card key={label} variant="inset" className="px-space-10 py-space-8">
                <Text variant="figure" as="div">{count}</Text>
                <Text variant="overline" tone="ink-3" as="div">{label}</Text>
              </Card>
            ))}
          </div>
          <div className="px-space-10 pb-space-10">
            <Card variant="inset">
              <CardRow>
                <Text variant="label" className="flex-1">Skipped · not a transaction</Text>
                <Text variant="label" tone="ink-3">7 emails</Text>
              </CardRow>
              <CardRow>
                <Text variant="label" className="flex-1">HDFC Bank alerts</Text>
                <Text variant="label" tone="ink-3">3 emails</Text>
              </CardRow>
            </Card>
          </div>
        </Card>
      </div>
    ),
  },
};

export const DangerTone: Story = {
  name: 'Danger tone',
  args: {
    tone: 'danger',
    title: 'Delete account',
    subtitle: 'Removes every account, transaction, statement, rule and connection. Cannot be undone.',
    children: (
      <div className="px-space-16 pb-space-16">
        <Button variant="danger">Delete my account</Button>
      </div>
    ),
  },
};
