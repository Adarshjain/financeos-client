import { describe, expect, it } from 'vitest';

import config from '../../../tailwind.config';
import {
  cn,
  CN_DURATION,
  CN_FONT_SIZE,
  CN_HEIGHT,
  CN_MAX_WIDTH,
  CN_MIN_HEIGHT,
  CN_MIN_WIDTH,
  CN_RADIUS,
  CN_SHADOW,
  CN_SIZE,
  CN_SPACING,
  CN_WIDTH,
  CN_Z_INDEX,
} from './cn';

describe('cn utility', () => {
  it('correctly resolves conflicting custom utility classes', () => {
    const pairs: [string, string][] = [
      ['p-space-4', 'p-0'],
      ['px-space-14', 'px-space-16'],
      ['h-control-md', 'h-auto'],
      ['w-control-md', 'w-full'],
      ['min-w-popover-trigger', 'min-w-0'],
      ['max-w-container-sm', 'max-w-none'],
      ['rounded-ds-md', 'rounded-ds-lg'],
      ['shadow-level-1', 'shadow-level-2'],
      ['z-sticky', 'z-overlay'],
      ['duration-fast', 'duration-base'],
      ['text-body', 'text-label'],
    ];

    for (const [first, second] of pairs) {
      expect(cn(first, second)).toBe(second);
    }
  });

  it('keeps both color and text size classes', () => {
    expect(cn('text-ink-3', 'text-body')).toBe('text-ink-3 text-body');
  });

  describe('drift guard against tailwind.config.ts', () => {
    const extend = config.theme?.extend ?? {};

    it('contains all custom spacing keys', () => {
      const cfgSpacing = Object.keys(extend.spacing ?? {});
      expect(CN_SPACING).toEqual(expect.arrayContaining(cfgSpacing));
      expect(cfgSpacing).toEqual(expect.arrayContaining([...CN_SPACING]));
    });

    it('contains all custom radius keys starting with ds-', () => {
      const cfgRadius = Object.keys(extend.borderRadius ?? {}).filter((k) =>
        k.startsWith('ds-')
      );
      expect(CN_RADIUS).toEqual(expect.arrayContaining(cfgRadius));
      expect(cfgRadius).toEqual(expect.arrayContaining([...CN_RADIUS]));
    });

    it('contains all custom shadow keys', () => {
      const cfgShadow = Object.keys(extend.boxShadow ?? {});
      expect(CN_SHADOW).toEqual(expect.arrayContaining(cfgShadow));
      expect(cfgShadow).toEqual(expect.arrayContaining([...CN_SHADOW]));
    });

    it('contains all custom font-size keys', () => {
      const cfgFontSize = Object.keys(extend.fontSize ?? {}).filter(
        (k) => k !== '2xs'
      );
      expect(CN_FONT_SIZE).toEqual(expect.arrayContaining(cfgFontSize));
      expect(cfgFontSize).toEqual(expect.arrayContaining([...CN_FONT_SIZE]));
    });

    it('contains all custom height keys', () => {
      const cfgHeight = Object.keys(extend.height ?? {});
      expect(CN_HEIGHT).toEqual(expect.arrayContaining(cfgHeight));
      expect(cfgHeight).toEqual(expect.arrayContaining([...CN_HEIGHT]));
    });

    it('contains all custom minHeight keys', () => {
      const cfgMinHeight = Object.keys(extend.minHeight ?? {});
      expect(CN_MIN_HEIGHT).toEqual(expect.arrayContaining(cfgMinHeight));
      expect(cfgMinHeight).toEqual(expect.arrayContaining([...CN_MIN_HEIGHT]));
    });

    it('contains all custom width keys', () => {
      const cfgWidth = Object.keys(extend.width ?? {});
      expect(CN_WIDTH).toEqual(expect.arrayContaining(cfgWidth));
      expect(cfgWidth).toEqual(expect.arrayContaining([...CN_WIDTH]));
    });

    it('contains all custom minWidth keys', () => {
      const cfgMinWidth = Object.keys(extend.minWidth ?? {});
      expect(CN_MIN_WIDTH).toEqual(expect.arrayContaining(cfgMinWidth));
      expect(cfgMinWidth).toEqual(expect.arrayContaining([...CN_MIN_WIDTH]));
    });

    it('contains all custom maxWidth keys', () => {
      const cfgMaxWidth = Object.keys(extend.maxWidth ?? {});
      expect(CN_MAX_WIDTH).toEqual(expect.arrayContaining(cfgMaxWidth));
      expect(cfgMaxWidth).toEqual(expect.arrayContaining([...CN_MAX_WIDTH]));
    });

    it('contains all custom size keys', () => {
      const cfgSize = Object.keys(extend.size ?? {});
      expect(CN_SIZE).toEqual(expect.arrayContaining(cfgSize));
      expect(cfgSize).toEqual(expect.arrayContaining([...CN_SIZE]));
    });

    it('contains all custom zIndex keys', () => {
      const cfgZIndex = Object.keys(extend.zIndex ?? {});
      expect(CN_Z_INDEX).toEqual(expect.arrayContaining(cfgZIndex));
      expect(cfgZIndex).toEqual(expect.arrayContaining([...CN_Z_INDEX]));
    });

    it('contains all custom transitionDuration keys', () => {
      const cfgDuration = Object.keys(extend.transitionDuration ?? {});
      expect(CN_DURATION).toEqual(expect.arrayContaining(cfgDuration));
      expect(cfgDuration).toEqual(expect.arrayContaining([...CN_DURATION]));
    });
  });
});
