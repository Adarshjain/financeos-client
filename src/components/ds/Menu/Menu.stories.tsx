import type { Meta, StoryObj } from '@storybook/react';
import { Check, Eye, LayoutGrid, MoreVertical, Plus } from 'lucide-react';
import React from 'react';

import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Menu,
  MenuGroup,
  MenuItem,
  MenuSeparator,
} from './Menu';

const meta = {
  title: 'DS/Actions/Menu',
  component: Menu,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Actions: Story = {
  render: () => {
    return (
      <div className="max-w-xs">
        <Menu>
          <MenuItem>Find matches</MenuItem>
          <MenuItem>Edit rule</MenuItem>
          <MenuSeparator />
          <MenuItem destructive>Delete rule</MenuItem>
        </Menu>
      </div>
    );
  },
};

export const WithIconsAndHints: Story = {
  render: () => {
    return (
      <div className="max-w-sm">
        <Menu>
          <MenuItem
            icon={<Plus className="w-space-14 h-space-14" />}
            hint="built-in or report"
          >
            Add widget
          </MenuItem>
          <MenuItem
            icon={<Eye className="w-space-14 h-space-14" />}
            hint="arrange, resize"
          >
            Edit dashboard
          </MenuItem>
          <MenuItem icon={<LayoutGrid className="w-space-14 h-space-14" />}>
            New dashboard
          </MenuItem>
        </Menu>
      </div>
    );
  },
};

export const SnoozePresets: Story = {
  render: () => {
    return (
      <div className="max-w-xs">
        <Menu>
          <MenuItem hint="Wed 14 Oct">Tomorrow</MenuItem>
          <MenuItem hint="Fri 16 Oct">In 3 days</MenuItem>
          <MenuItem hint="Tue 20 Oct">Next week</MenuItem>
          <MenuSeparator />
          <MenuItem>Pick a date…</MenuItem>
        </Menu>
      </div>
    );
  },
};

export const DisabledItem: Story = {
  render: () => {
    return (
      <div className="max-w-xs">
        <Menu>
          <MenuItem>Edit details</MenuItem>
          <MenuItem>Reassign transactions</MenuItem>
          <MenuSeparator />
          <MenuItem disabled hint="has transactions">
            Delete cardholder
          </MenuItem>
        </Menu>
      </div>
    );
  },
};

export const Sectioned: Story = {
  render: () => {
    return (
      <div className="max-w-xs">
        <Menu>
          <MenuGroup label="This widget">
            <MenuItem>Widget settings</MenuItem>
            <MenuItem>View full page</MenuItem>
          </MenuGroup>
          <MenuGroup label="Report">
            <MenuItem>Edit report</MenuItem>
            <MenuItem>Duplicate as my report</MenuItem>
          </MenuGroup>
        </Menu>
      </div>
    );
  },
};

export const SwitcherWithAFooterLink: Story = {
  render: () => {
    return (
      <div className="max-w-xs">
        <Menu>
          <MenuItem
            active
            hint={
              <span className="inline-flex items-center gap-space-2">
                Default <Icon icon={Check} size="sm" />
              </span>
            }
          >
            Home
          </MenuItem>
          <MenuItem>Money overview</MenuItem>
          <MenuItem>Cards & loans</MenuItem>
          <MenuSeparator />
          <MenuItem action>View all dashboards</MenuItem>
        </Menu>
      </div>
    );
  },
};

export const FloatingDropdown: Story = {
  render: () => {
    return (
      <div className="p-space-24">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              icon={<MoreVertical className="w-space-14 h-space-14" />}
              aria-label="Options"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem>Find matches</DropdownMenuItem>
            <DropdownMenuItem>Edit rule</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive>Delete rule</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
};

export const AllVariants: Story = {
  render: () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 p-space-16 max-w-3xl bg-canvas rounded-ds-lg border border-line">
        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Actions
          </span>
          <Menu>
            <MenuItem>Find matches</MenuItem>
            <MenuItem>Edit rule</MenuItem>
            <MenuSeparator />
            <MenuItem destructive>Delete rule</MenuItem>
          </Menu>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            With icons and hints
          </span>
          <Menu>
            <MenuItem
              icon={<Plus className="w-space-14 h-space-14" />}
              hint="built-in or report"
            >
              Add widget
            </MenuItem>
            <MenuItem
              icon={<Eye className="w-space-14 h-space-14" />}
              hint="arrange, resize"
            >
              Edit dashboard
            </MenuItem>
            <MenuItem icon={<LayoutGrid className="w-space-14 h-space-14" />}>
              New dashboard
            </MenuItem>
          </Menu>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Snooze presets
          </span>
          <Menu>
            <MenuItem hint="Wed 14 Oct">Tomorrow</MenuItem>
            <MenuItem hint="Fri 16 Oct">In 3 days</MenuItem>
            <MenuItem hint="Tue 20 Oct">Next week</MenuItem>
            <MenuSeparator />
            <MenuItem>Pick a date…</MenuItem>
          </Menu>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Disabled item
          </span>
          <Menu>
            <MenuItem>Edit details</MenuItem>
            <MenuItem>Reassign transactions</MenuItem>
            <MenuSeparator />
            <MenuItem disabled hint="has transactions">
              Delete cardholder
            </MenuItem>
          </Menu>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Sectioned
          </span>
          <Menu>
            <MenuGroup label="This widget">
              <MenuItem>Widget settings</MenuItem>
              <MenuItem>View full page</MenuItem>
            </MenuGroup>
            <MenuGroup label="Report">
              <MenuItem>Edit report</MenuItem>
              <MenuItem>Duplicate as my report</MenuItem>
            </MenuGroup>
          </Menu>
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Switcher with a footer link
          </span>
          <Menu>
            <MenuItem
              active
              hint={
                <span className="inline-flex items-center gap-space-2">
                  Default <Icon icon={Check} size="sm" />
                </span>
              }
            >
              Home
            </MenuItem>
            <MenuItem>Money overview</MenuItem>
            <MenuItem>Cards & loans</MenuItem>
            <MenuSeparator />
            <MenuItem action>View all dashboards</MenuItem>
          </Menu>
        </div>
      </div>
    );
  },
};
