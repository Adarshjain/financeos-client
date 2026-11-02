'use client';

import React from 'react';

import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import type { ChartProps } from '@/components/organisms/Chart/Chart';

// The chart library is not in the page's JS: the Chart loads after hydration, with a skeleton of the chart's own frame
// (16:9, 21:9 from `desk`; or the parent's full height with `fill`) so nothing shifts when it arrives.
// Not next/dynamic: its fallback shows for a render even when the code is already in, which was a second loading state.
// Here the Chart renders in the same commit that learns its code is in.
type ChartComponent = React.ComponentType<ChartProps>;
const loadChart = () => import('@/components/organisms/Chart/Chart').then((m) => m.Chart as ChartComponent);

let loadedChart: ChartComponent | null = null;
let chartLoad: Promise<unknown> | null = null;

/** Starts fetching the Chart's code (once). Resolves when it is in; a failed fetch is retried by the next call. */
export function preloadChart(): Promise<unknown> {
  if (!chartLoad) {
    chartLoad = loadChart().then(
      (component) => {
        loadedChart = component;
      },
      () => {
        chartLoad = null;
      },
    );
  }
  return chartLoad;
}

/**
 * Whether the Chart's code is in. With `wanted`, starts fetching it. A consumer that is about to draw a chart keeps its own
 * loading state until this is true, so the user sees that one loading state and then the chart, not a second chart-frame skeleton.
 */
export function useChartReady(wanted: boolean): boolean {
  const [ready, setReady] = React.useState(loadedChart !== null);
  React.useEffect(() => {
    if (loadedChart) {
      setReady(true);
      return;
    }
    if (!wanted) return;
    let live = true;
    void preloadChart().then(() => {
      if (live) setReady(loadedChart !== null);
    });
    return () => {
      live = false;
    };
  }, [wanted]);
  return ready || loadedChart !== null;
}

/** The Chart organism, loaded on demand. Same props and behaviour as Chart. */
export function LazyChart(props: ChartProps) {
  const ready = useChartReady(true);
  if (!ready || !loadedChart) {
    // `h-auto`: Skeleton's own 12px height would otherwise win over the aspect ratio and draw a thin line.
    return props.fill ? <Skeleton className="h-full min-h-0 w-full" /> : <Skeleton className="h-auto aspect-video desk:aspect-wide w-full" />;
  }
  const Chart = loadedChart;
  return <Chart {...props} />;
}
