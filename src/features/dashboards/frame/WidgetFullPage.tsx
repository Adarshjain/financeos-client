'use client';

// "View full page" of a report widget: the same content in a dialog that fills the whole viewport, in whatever
// orientation the device is in. Its table state (page, sort) is its own; the data is the widget's own cache entry.

import React from 'react';

import { Banner, Dialog, DialogBody, DialogContent, Skeleton } from '@/components/ds';
import { widgetTitle } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';

import { ReportWidgetBody } from './ReportWidgetBody';
import { useReportWidget } from './useReportWidget';
import { widgetSubtitle } from './widgetFrame.model';

export function WidgetFullPage({ widget, onClose }: { widget: WidgetResponse; onClose: () => void }) {
  const state = useReportWidget(widget);
  const subtitle = widgetSubtitle(widget);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="full" title={widgetTitle(widget)} description={typeof subtitle === 'string' ? subtitle : undefined}>
        <DialogBody>
          {state.error ? (
            <Banner tone="danger" title="Couldn't load this widget" action={{ label: 'Retry', onSelect: () => void state.refetch() }}>
              {state.error}
            </Banner>
          ) : state.data ? (
            <ReportWidgetBody widget={widget} state={state} />
          ) : (
            <Skeleton height={160} />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
