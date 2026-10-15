import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';

import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuSeparator,
} from './Menu';

const meta: Meta<typeof Menu> = {
  title: 'DS/Actions/Menu',
  component: Menu,
  argTypes: {
    align: {
      control: { type: 'select' },
      options: ['start', 'center', 'end'],
    },
    side: {
      control: { type: 'select' },
      options: ['top', 'bottom', 'left', 'right'],
    },
    open: {
      control: { type: 'boolean' },
    },
    defaultOpen: {
      control: { type: 'boolean' },
    },
  },
  args: {
    align: 'start',
    side: 'bottom',
    defaultOpen: true,
  },
  render: function Render(args) {
    const [{ open }, updateArgs] = useArgs();
    return (
      <Menu
        {...args}
        open={open}
        onOpenChange={(val) => updateArgs({ open: val })}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof Menu>;

const ActionsContent = () => (
  <>
    <MenuItem>Find matches</MenuItem>
    <MenuItem>Edit rule</MenuItem>
    <MenuSeparator />
    <MenuItem destructive>Delete rule</MenuItem>
  </>
);

const IconsAndHintsContent = () => (
  <>
    <MenuItem
      icon={<Icon name="add" size="sm" />}
      hint="built-in or report"
    >
      Add widget
    </MenuItem>
    <MenuItem
      icon={<Icon name="view" size="sm" />}
      hint="arrange, resize"
    >
      Edit dashboard
    </MenuItem>
    <MenuItem icon={<Icon name="calendar" size="sm" />}>
      New dashboard
    </MenuItem>
  </>
);

const SnoozePresetsContent = () => (
  <>
    <MenuItem hint="Wed 14 Oct">Tomorrow</MenuItem>
    <MenuItem hint="Fri 16 Oct">In 3 days</MenuItem>
    <MenuItem hint="Tue 20 Oct">Next week</MenuItem>
    <MenuSeparator />
    <MenuItem>Pick a date…</MenuItem>
  </>
);

const DisabledItemContent = () => (
  <>
    <MenuItem>Edit details</MenuItem>
    <MenuItem>Reassign transactions</MenuItem>
    <MenuSeparator />
    <MenuItem disabled hint="has transactions">
      Delete cardholder
    </MenuItem>
  </>
);

const SectionedContent = () => (
  <>
    <MenuGroup label="This widget">
      <MenuItem>Widget settings</MenuItem>
      <MenuItem>View full page</MenuItem>
    </MenuGroup>
    <MenuGroup label="Report">
      <MenuItem>Edit report</MenuItem>
      <MenuItem>Duplicate as my report</MenuItem>
    </MenuGroup>
  </>
);

const SwitcherContent = () => (
  <>
    <MenuItem
      active
      hint={
        <span className="inline-flex items-center gap-space-2 text-brand-strong">
          Default <Icon name="check" size="sm" />
        </span>
      }
    >
      Home
    </MenuItem>
    <MenuItem>Money overview</MenuItem>
    <MenuItem>Cards & loans</MenuItem>
    <MenuSeparator />
    <MenuItem action>View all dashboards</MenuItem>
  </>
);

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-24 p-space-16 max-w-4xl">
      <div className="flex flex-col gap-space-8">
        <span className="font-text text-overline font-extrabold uppercase text-ink-4">
          Actions
        </span>
        <div className="relative">
          <Menu
            defaultOpen
            trigger={
              <Button variant="secondary" iconOnly aria-label="Actions">
                <Icon name="more" size="md" />
              </Button>
            }
          >
            <ActionsContent />
          </Menu>
        </div>
      </div>

      <div className="flex flex-col gap-space-8">
        <span className="font-text text-overline font-extrabold uppercase text-ink-4">
          With icons and hints
        </span>
        <div className="relative">
          <Menu
            defaultOpen
            trigger={
              <Button variant="secondary" iconOnly aria-label="Options">
                <Icon name="more" size="md" />
              </Button>
            }
          >
            <IconsAndHintsContent />
          </Menu>
        </div>
      </div>

      <div className="flex flex-col gap-space-8 pt-space-48">
        <span className="font-text text-overline font-extrabold uppercase text-ink-4">
          Snooze presets
        </span>
        <div className="relative">
          <Menu
            defaultOpen
            trigger={
              <Button variant="secondary" iconOnly aria-label="Snooze">
                <Icon name="more" size="md" />
              </Button>
            }
          >
            <SnoozePresetsContent />
          </Menu>
        </div>
      </div>

      <div className="flex flex-col gap-space-8 pt-space-48">
        <span className="font-text text-overline font-extrabold uppercase text-ink-4">
          Disabled item
        </span>
        <div className="relative">
          <Menu
            defaultOpen
            trigger={
              <Button variant="secondary" iconOnly aria-label="Cardholder">
                <Icon name="more" size="md" />
              </Button>
            }
          >
            <DisabledItemContent />
          </Menu>
        </div>
      </div>

      <div className="flex flex-col gap-space-8 pt-space-48">
        <span className="font-text text-overline font-extrabold uppercase text-ink-4">
          Sectioned
        </span>
        <div className="relative">
          <Menu
            defaultOpen
            trigger={
              <Button variant="secondary" iconOnly aria-label="Widget">
                <Icon name="more" size="md" />
              </Button>
            }
          >
            <SectionedContent />
          </Menu>
        </div>
      </div>

      <div className="flex flex-col gap-space-8 pt-space-48">
        <span className="font-text text-overline font-extrabold uppercase text-ink-4">
          Switcher with a footer link
        </span>
        <div className="relative">
          <Menu
            defaultOpen
            trigger={
              <Button variant="secondary" iconOnly aria-label="Dashboards">
                <Icon name="more" size="md" />
              </Button>
            }
          >
            <SwitcherContent />
          </Menu>
        </div>
      </div>
    </div>
  ),
};

export const Actions: Story = {
  args: {
    defaultOpen: true,
    trigger: (
      <Button variant="secondary" iconOnly aria-label="Rule actions">
        <Icon name="more" size="md" />
      </Button>
    ),
    children: <ActionsContent />,
  },
};

export const WithIconsAndHints: Story = {
  args: {
    defaultOpen: true,
    trigger: (
      <Button variant="secondary" iconOnly aria-label="Dashboard actions">
        <Icon name="more" size="md" />
      </Button>
    ),
    children: <IconsAndHintsContent />,
  },
};

export const SnoozePresets: Story = {
  args: {
    defaultOpen: true,
    trigger: (
      <Button variant="secondary" iconOnly aria-label="Snooze options">
        <Icon name="more" size="md" />
      </Button>
    ),
    children: <SnoozePresetsContent />,
  },
};

export const DisabledItem: Story = {
  args: {
    defaultOpen: true,
    trigger: (
      <Button variant="secondary" iconOnly aria-label="Cardholder options">
        <Icon name="more" size="md" />
      </Button>
    ),
    children: <DisabledItemContent />,
  },
};

export const Sectioned: Story = {
  args: {
    defaultOpen: true,
    trigger: (
      <Button variant="secondary" iconOnly aria-label="Widget options">
        <Icon name="more" size="md" />
      </Button>
    ),
    children: <SectionedContent />,
  },
};

export const SwitcherWithAFooterLink: Story = {
  args: {
    defaultOpen: true,
    trigger: (
      <Button variant="secondary" iconOnly aria-label="Switch dashboard">
        <Icon name="more" size="md" />
      </Button>
    ),
    children: <SwitcherContent />,
  },
};
