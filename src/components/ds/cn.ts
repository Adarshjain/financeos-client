import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const SPACING_KEYS = {
  'space-2': true,
  'space-4': true,
  'space-6': true,
  'space-8': true,
  'space-10': true,
  'space-12': true,
  'space-14': true,
  'space-16': true,
  'space-20': true,
  'space-24': true,
  'space-28': true,
  'space-32': true,
  'space-40': true,
  'space-48': true,
  'space-56': true,
  'space-64': true,
  'space-96': true,
  'safe-12': true,
  'safe-24': true,
  'safe-top': true,
  'safe-left': true,
  'safe-right': true,
  'safe-56': true,
  'sticky-offset': true,
  'bottom-clearance': true,
};

export const CN_SPACING = Object.keys(SPACING_KEYS);

export const CN_RADIUS = [
  'ds-2xs',
  'ds-xs',
  'ds-sm',
  'ds-md',
  'ds-lg',
  'ds-xl',
  'ds-2xl',
  'ds-pill',
] as const;

export const CN_SHADOW = [
  'level-1',
  'level-2',
  'level-3',
  'up-1',
  'up-2',
] as const;

export const CN_FONT_SIZE = [
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
] as const;

export const CN_HEIGHT = [
  'icon-xs',
  'icon-sm',
  'icon-md',
  'icon-lg',
  'icon-inline',
  'control-sm',
  'control-md',
  'control-lg',
  'control-xl',
] as const;

export const CN_MIN_HEIGHT = [
  'control-sm',
  'control-md',
  'control-lg',
  'control-xl',
] as const;

export const CN_WIDTH = [
  'icon-xs',
  'icon-sm',
  'icon-md',
  'icon-lg',
  'icon-inline',
  'control-sm',
  'control-md',
  'control-lg',
  'control-xl',
  'container-xs',
  'popover-trigger',
  'menu-trigger',
] as const;

export const CN_MIN_WIDTH = [
  'popover-trigger',
  'menu-trigger',
  'control-sm',
  'control-md',
  'control-lg',
  'control-xl',
  'container-xs',
] as const;

export const CN_MAX_WIDTH = [
  'container-sm',
  'container-md',
  'container-lg',
  'container-xl',
  'container-viewport-inset',
] as const;

export const CN_SIZE = [
  'icon-xs',
  'icon-sm',
  'icon-md',
  'icon-lg',
  'icon-inline',
] as const;

export const CN_Z_INDEX = [
  'sticky',
  'floating',
  'backdrop',
  'overlay',
] as const;

export const CN_DURATION = [
  'fast',
  'base',
  'slow',
  'loop',
] as const;

const customTwMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: [...CN_SPACING],
      radius: [...CN_RADIUS],
      shadow: [...CN_SHADOW],
    },
    classGroups: {
      'font-size': [{ text: [...CN_FONT_SIZE] }],
      h: [{ h: [...CN_HEIGHT] }],
      'min-h': [{ 'min-h': [...CN_MIN_HEIGHT] }],
      w: [{ w: [...CN_WIDTH] }],
      'min-w': [{ 'min-w': [...CN_MIN_WIDTH] }],
      'max-w': [{ 'max-w': [...CN_MAX_WIDTH] }],
      size: [{ size: [...CN_SIZE] }],
      z: [{ z: [...CN_Z_INDEX] }],
      duration: [{ duration: [...CN_DURATION] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}
