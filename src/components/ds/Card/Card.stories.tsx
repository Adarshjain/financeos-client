import type { Meta, StoryObj } from '@storybook/react';
import { ChevronRight } from 'lucide-react';
import React from 'react';

import { FilterChip } from '../FilterChip/FilterChip';
import { Icon } from '../Icon/Icon';
import { Card, CardEmpty, CardFooter, CardRow, CardSection } from './Card';

const meta = {
  title: 'DS/Data display/Card',
  component: Card,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TitleSubtitleLink: Story = {
  render: () => {
    return (
      <div className="max-w-md">
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
    );
  },
};

export const WithAnAction: Story = {
  render: () => {
    return (
      <div className="max-w-md">
        <Card
          title="Statements"
          subtitle="Each statement is a bill"
          action={<FilterChip hasDropdown>FY 26-27</FilterChip>}
        />
      </div>
    );
  },
};

export const WithRows: Story = {
  render: () => {
    return (
      <div className="max-w-md">
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
    );
  },
};

export const WithAPager: Story = {
  render: () => {
    return (
      <div className="max-w-md">
        <Card title="Earning lines">
          <CardRow>
            <span className="flex-1 truncate">IKEA India</span>
            <span className="font-bold font-text text-ink">196 pts</span>
          </CardRow>
          <CardFooter>
            <span>
              <b className="text-ink font-bold">1–25</b> of 30
            </span>
            <div className="flex gap-space-4 items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center min-w-control-md h-control-md px-space-6 rounded-ds-md bg-brand text-on-brand font-text font-semibold text-body"
              >
                1
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center min-w-control-md h-control-md px-space-6 rounded-ds-md bg-surface text-ink-2 font-text font-semibold text-body hover:bg-hover"
              >
                2
              </button>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  },
};

export const WithSectionBands: Story = {
  render: () => {
    return (
      <div className="max-w-md">
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
    );
  },
};

export const Empty: Story = {
  render: () => {
    return (
      <div className="max-w-md">
        <Card title="Untagged · 0">
          <CardEmpty>Every transaction has a category.</CardEmpty>
        </Card>
      </div>
    );
  },
};

export const AllVariants: Story = {
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
            <CardFooter>
              <span>
                <b className="text-ink font-bold">1–25</b> of 30
              </span>
              <div className="flex gap-space-4 items-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center min-w-control-md h-control-md px-space-6 rounded-ds-md bg-brand text-on-brand font-text font-semibold text-body"
                >
                  1
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center min-w-control-md h-control-md px-space-6 rounded-ds-md bg-surface text-ink-2 font-text font-semibold text-body hover:bg-hover"
                >
                  2
                </button>
              </div>
            </CardFooter>
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
