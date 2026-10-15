import type { Meta, StoryObj } from '@storybook/react';
import { ChevronRight } from 'lucide-react';
import React from 'react';

import { Button } from '../Button/Button';
import { FilterChip } from '../FilterChip/FilterChip';
import { Icon } from '../Icon/Icon';
import { Pager } from '../Pager/Pager';
import { Card, CardEmpty, CardFooter, CardRow, CardSection } from './Card';

const meta = {
  title: 'DS/Data display/Card',
  component: Card,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 p-space-16 max-w-4xl bg-canvas rounded-ds-lg border border-line">
        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Title · subtitle · link
          </span>
          <Card
            title="Needs you"
            subtitle="Act now · 2"
            action={
              <a
                href="#inbox"
                className="font-text font-bold text-label text-brand hover:underline"
              >
                <span className="inline-flex items-center gap-space-2">
                  Inbox <Icon icon={ChevronRight} size="sm" />
                </span>
              </a>
            }
          />
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            With an action
          </span>
          <Card
            title="Statements"
            subtitle="Each statement is a bill"
            action={<FilterChip hasDropdown>FY 26-27</FilterChip>}
          />
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            With rows
          </span>
          <Card title="Next 14 days">
            <CardRow>
              <span className="flex-1 truncate">Amex Platinum bill</span>
              <span className="font-bold font-text text-ink">₹33,900</span>
            </CardRow>
            <CardRow>
              <span className="flex-1 truncate">Priya Nair · you owe</span>
              <span className="font-bold font-text text-ink">₹12,000</span>
            </CardRow>
          </Card>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            With a pager
          </span>
          <Card title="Earning lines">
            <CardRow>
              <span className="flex-1 truncate">IKEA India</span>
              <span className="font-bold font-text text-ink">196 pts</span>
            </CardRow>
            <Pager
              page={0}
              size={25}
              totalElements={30}
              totalPages={2}
              onPageChange={() => {}}
            />
          </Card>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            With section bands
          </span>
          <Card>
            <CardSection>Act now · 2</CardSection>
            <CardRow>
              <span className="flex-1 truncate">SBI statement missing</span>
            </CardRow>
            <CardSection>Updates · 4</CardSection>
            <CardRow>
              <span className="flex-1 truncate">Prices refreshed</span>
            </CardRow>
          </Card>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Empty
          </span>
          <Card title="Untagged · 0">
            <CardEmpty>Every transaction has a category.</CardEmpty>
          </Card>
        </div>
      </div>
    );
  },
};

export const TitleSubtitleLink: Story = {
  name: 'Title · subtitle · link',
  args: {
    title: 'Needs you',
    subtitle: 'Act now · 2',
    action: (
      <a
        href="#inbox"
        className="font-text font-bold text-label text-brand hover:underline"
      >
        <span className="inline-flex items-center gap-space-2">
          Inbox <Icon icon={ChevronRight} size="sm" />
        </span>
      </a>
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
          <span className="flex-1 truncate">Amex Platinum bill</span>
          <span className="font-bold font-text text-ink">₹33,900</span>
        </CardRow>
        <CardRow>
          <span className="flex-1 truncate">Priya Nair · you owe</span>
          <span className="font-bold font-text text-ink">₹12,000</span>
        </CardRow>
      </>
    ),
  },
};

export const WithAPager: Story = {
  name: 'With a pager',
  args: {
    title: 'Earning lines',
    children: (
      <>
        <CardRow>
          <span className="flex-1 truncate">IKEA India</span>
          <span className="font-bold font-text text-ink">196 pts</span>
        </CardRow>
        <Pager
          page={0}
          size={25}
          totalElements={30}
          totalPages={2}
          onPageChange={() => {}}
        />
      </>
    ),
  },
};

export const WithSectionBands: Story = {
  name: 'With section bands',
  args: {
    children: (
      <>
        <CardSection>Act now · 2</CardSection>
        <CardRow>
          <span className="flex-1 truncate">SBI statement missing</span>
        </CardRow>
        <CardSection>Updates · 4</CardSection>
        <CardRow>
          <span className="flex-1 truncate">Prices refreshed</span>
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

