'use client';

// The Dinero bodies, views, skeletons and subtitles of this group's built-ins, keyed by builtinKey.
//
// Component built-ins have a `Body` that fetches its own data: attention, bills_due, card_utilisation,
// account_tile, emergency_fund. Template built-ins have a `View` the frame feeds with the loaded report data
// (keyed here by builtin key; the server's `view` name only picks the Legacy renderer): net_worth (KPI),
// upcoming (table), milestone_progress, cap_headroom, rewards_earned, spend_heatmap (the Chart heatmap).

import { createElement } from 'react';

import { heatmapMonths } from '@/components/organisms/Chart/heatmap.model';
import { widgetParams } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';

import { AccountTileBody } from './account-tile/AccountTileBody';
import { AccountTileSkeleton } from './account-tile/AccountTileSkeleton';
import { AccountTypeSubtitle, CardNameSubtitle } from './AccountSubtitles';
import { AttentionBody } from './attention/AttentionBody';
import { AttentionSkeleton } from './attention/AttentionSkeleton';
import { AttentionSubtitle } from './attention/AttentionSubtitle';
import { BillsDueBody } from './bills-due/BillsDueBody';
import { BillsDueSkeleton } from './bills-due/BillsDueSkeleton';
import { CapHeadroomSkeleton } from './cap-headroom/CapHeadroomSkeleton';
import { CapHeadroomView } from './cap-headroom/CapHeadroomView';
import { CardUtilisationBody } from './card-utilisation/CardUtilisationBody';
import { CardUtilisationSkeleton } from './card-utilisation/CardUtilisationSkeleton';
import { EmergencyFundBody } from './emergency-fund/EmergencyFundBody';
import { EmergencyFundSkeleton } from './emergency-fund/EmergencyFundSkeleton';
import { MilestoneProgressSkeleton } from './milestone-progress/MilestoneProgressSkeleton';
import { MilestoneProgressView } from './milestone-progress/MilestoneProgressView';
import { NetWorthSkeleton } from './net-worth/NetWorthSkeleton';
import { NetWorthView } from './net-worth/NetWorthView';
import { RewardsEarnedSkeleton } from './rewards-earned/RewardsEarnedSkeleton';
import { RewardsEarnedView } from './rewards-earned/RewardsEarnedView';
import { SpendHeatmapSkeleton } from './spend-heatmap/SpendHeatmapSkeleton';
import { SpendHeatmapView } from './spend-heatmap/SpendHeatmapView';
import {
  ALL_CARDS_SUBTITLE,
  monthsSubtitle,
  NET_WORTH_SUBTITLE,
  stringParam,
  upcomingSubtitle,
} from './subtitlesModel';
import type { DineroBuiltin } from './types';
import { UpcomingSkeleton } from './upcoming/UpcomingSkeleton';
import { UpcomingView } from './upcoming/UpcomingView';

/** A card-scoped widget's subtitle: the picked card's name, else `fallback` (null defers to the server's). */
function cardSubtitle(fallback: string | null) {
  return function subtitleOf(widget: WidgetResponse) {
    const accountId = stringParam(widgetParams(widget), 'accountId');
    return accountId ? createElement(CardNameSubtitle, { accountId }) : fallback;
  };
}

export const CARDS_SPENDING_BUILTINS: Readonly<Record<string, DineroBuiltin>> = {
  net_worth: { View: NetWorthView, Skeleton: NetWorthSkeleton, subtitle: () => NET_WORTH_SUBTITLE },
  attention: { flush: true, Body: AttentionBody, Skeleton: AttentionSkeleton, subtitle: () => createElement(AttentionSubtitle) },
  upcoming: { flush: true, View: UpcomingView, Skeleton: UpcomingSkeleton, subtitle: (widget) => upcomingSubtitle(widgetParams(widget)) },
  bills_due: { flush: true, Body: BillsDueBody, Skeleton: BillsDueSkeleton, subtitle: cardSubtitle(ALL_CARDS_SUBTITLE) },
  card_utilisation: { flush: true, Body: CardUtilisationBody, Skeleton: CardUtilisationSkeleton, subtitle: cardSubtitle(ALL_CARDS_SUBTITLE) },
  milestone_progress: { flush: true, View: MilestoneProgressView, Skeleton: MilestoneProgressSkeleton, subtitle: cardSubtitle(null) },
  cap_headroom: { flush: true, View: CapHeadroomView, Skeleton: CapHeadroomSkeleton, subtitle: cardSubtitle(null) },
  rewards_earned: { View: RewardsEarnedView, Skeleton: RewardsEarnedSkeleton },
  spend_heatmap: {
    View: SpendHeatmapView,
    Skeleton: SpendHeatmapSkeleton,
    subtitle: (widget) => monthsSubtitle(heatmapMonths(widgetParams(widget))),
  },
  account_tile: {
    Body: AccountTileBody,
    Skeleton: AccountTileSkeleton,
    subtitle: (widget) => {
      const accountId = stringParam(widgetParams(widget), 'accountId');
      return accountId ? createElement(AccountTypeSubtitle, { accountId }) : null;
    },
  },
  emergency_fund: { Body: EmergencyFundBody, Skeleton: EmergencyFundSkeleton },
};
