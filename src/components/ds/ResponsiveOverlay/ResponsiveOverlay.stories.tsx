import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';

import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { ResponsiveOverlay } from './ResponsiveOverlay';

const meta: Meta<typeof ResponsiveOverlay> = {
  title: 'DS/Overlays/ResponsiveOverlay',
  component: ResponsiveOverlay,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    open: {
      control: 'boolean',
    },
    title: {
      control: 'text',
    },
  },
  args: {
    open: false,
    title: 'Bank',
  },
  render: function Render(args) {
    const [{ open }, updateArgs] = useArgs();
    return (
      <div className="p-space-16 font-text">
        <ResponsiveOverlay
          {...args}
          open={open ?? args.open}
          onOpenChange={(val) => updateArgs({ open: val })}
          trigger={
            <Button variant="secondary" className="gap-space-8">
              <span>HDFC Regalia Gold</span>
              <Icon name="chevron-down" size="sm" />
            </Button>
          }
        >
          <div className="p-space-8 flex flex-col gap-space-4 min-w-popover-trigger">
            <div className="px-space-8 py-space-6 rounded-ds-md bg-brand-tint text-brand-strong font-medium text-body flex items-center justify-between">
              <span>HDFC Regalia Gold</span>
              <Icon name="check" size="sm" />
            </div>
            <div className="px-space-8 py-space-6 rounded-ds-md hover:bg-hover font-medium text-body text-ink cursor-pointer">
              Amex Platinum
            </div>
            <div className="px-space-8 py-space-6 rounded-ds-md hover:bg-hover font-medium text-body text-ink cursor-pointer">
              SBI SimplyClick
            </div>
          </div>
        </ResponsiveOverlay>
      </div>
    );
  },
};

export default meta;
type Story = StoryObj<typeof ResponsiveOverlay>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-24 max-w-2xl font-text">
      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Desktop Popover (on viewports &gt;= 1024px)
        </h4>
        <ResponsiveOverlay
          defaultOpen
          title="Bank"
          forcePopover
          trigger={
            <Button variant="secondary" className="gap-space-8">
              <span>HDFC Regalia Gold</span>
              <Icon name="chevron-down" size="sm" />
            </Button>
          }
        >
          <div className="p-space-8 flex flex-col gap-space-4 min-w-popover-trigger">
            <div className="px-space-8 py-space-6 rounded-ds-md bg-brand-tint text-brand-strong font-medium text-body flex items-center justify-between">
              <span>HDFC Regalia Gold</span>
              <Icon name="check" size="sm" />
            </div>
            <div className="px-space-8 py-space-6 rounded-ds-md hover:bg-hover font-medium text-body text-ink cursor-pointer">
              Amex Platinum
            </div>
            <div className="px-space-8 py-space-6 rounded-ds-md hover:bg-hover font-medium text-body text-ink cursor-pointer">
              SBI SimplyClick
            </div>
          </div>
        </ResponsiveOverlay>
      </div>
    </div>
  ),
};

export const DesktopPopover: Story = {
  name: 'Desktop popover',
  args: {
    open: true,
    title: 'Bank',
  },
};

export const PhoneSheet: Story = {
  name: 'Phone sheet',
  parameters: {
    viewport: { defaultViewport: 'phone' },
  },
  args: {
    open: true,
    title: 'Bank',
  },
};
