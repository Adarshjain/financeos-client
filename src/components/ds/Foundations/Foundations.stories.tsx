import type { Meta, StoryObj } from '@storybook/react';

import {
  FoundationsAll,
  FoundationsColours,
  FoundationsRadii,
  FoundationsShadows,
  FoundationsSpacing,
  FoundationsTypography,
} from './Foundations';

const meta: Meta = {
  title: 'DS/Foundations',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const Colours: StoryObj = {
  render: () => <FoundationsColours />,
};

export const Typography: StoryObj = {
  render: () => <FoundationsTypography />,
};

export const Spacing: StoryObj = {
  render: () => <FoundationsSpacing />,
};

export const Radii: StoryObj = {
  render: () => <FoundationsRadii />,
};

export const Shadows: StoryObj = {
  render: () => <FoundationsShadows />,
};

export const AllVariants: StoryObj = {
  render: () => <FoundationsAll />,
};
