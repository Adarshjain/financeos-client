import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
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
            'tab-label',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}
