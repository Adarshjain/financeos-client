'use client';

// The details step's static preview of a built-in, keyed by builtinKey: the widget as a tile on hard-coded sample
// data (nothing is fetched), captioned "Preview · sample data". A key without a preview of its own gets a note.

import { createElement } from 'react';

import { Text } from '@/components/ds/Text/Text';
import { Widget } from '@/components/ds/Widget/Widget';

import { WIDGET_PREVIEWS } from './previewSamples';

export { WIDGET_PREVIEWS } from './previewSamples';

/** Whether the client has a preview for this key (an unknown or prototype key has none). */
export function hasPreview(key: string): boolean {
  return Object.hasOwn(WIDGET_PREVIEWS, key);
}

export function WidgetPreview({ builtinKey, title }: { builtinKey: string; title: string }) {
  return (
    <figure className="m-0 flex flex-col gap-space-8">
      <Text as="figcaption" variant="overline" tone="ink-3">
        Preview · sample data
      </Text>
      <div data-testid="widget-preview-frame" aria-hidden="true" className="pointer-events-none select-none">
        <Widget title={title}>
          {hasPreview(builtinKey) ? (
            createElement(WIDGET_PREVIEWS[builtinKey])
          ) : (
            <Text variant="caption" tone="ink-3" data-testid="generic-preview">
              No preview for this widget yet.
            </Text>
          )}
        </Widget>
      </div>
    </figure>
  );
}
