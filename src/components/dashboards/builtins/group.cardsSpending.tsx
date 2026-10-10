'use client';

// Bodies, views and subtitles of this group's built-ins; registry.tsx merges them over the icons.
//
// Cards & rewards: card_utilisation (component), milestone_progress (view
// progress_list), cap_headroom (view cap_list), rewards_earned (view rewards_fy).
// Spending & overview: spend_heatmap (view heatmap), account_tile and
// emergency_fund (components).

import { createElement } from 'react';

import { AccountTileWidget, AccountTypeSubtitle } from '@/components/dashboards/widgets/account_tile/AccountTileWidget';
import { CapHeadroomView } from '@/components/dashboards/widgets/cap_headroom/CapHeadroomView';
import { CardUtilisationWidget } from '@/components/dashboards/widgets/card_utilisation/CardUtilisationWidget';
import { EmergencyFundWidget } from '@/components/dashboards/widgets/emergency_fund/EmergencyFundWidget';
import { MilestoneProgressView } from '@/components/dashboards/widgets/milestone_progress/MilestoneProgressView';
import { RewardsEarnedView } from '@/components/dashboards/widgets/rewards_earned/RewardsEarnedView';
import { heatmapMonths, SpendHeatmapView } from '@/components/dashboards/widgets/spend_heatmap/SpendHeatmapView';
import { widgetParams } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';

import { CardNameSubtitle } from './BuiltinSubtitle';
import type { GroupEntries, GroupViews } from './group.types';
import type { BuiltinBodyProps, PhoneSlot } from './registry';

const CONTENT: PhoneSlot = { fit: 'content' };

function stringParam(params: Record<string, unknown>, key: string): string | null {
  const v = params[key];
  return typeof v === 'string' && v ? v : null;
}

/** A card-scoped widget's subtitle: the picked card's name, else `fallback` (null defers to the server's). */
function cardSubtitle(fallback: string | null) {
  return function subtitleOf(widget: WidgetResponse) {
    const accountId = stringParam(widgetParams(widget), 'accountId');
    return accountId ? createElement(CardNameSubtitle, { accountId }) : fallback;
  };
}

function CardUtilisationBody({ params, className }: BuiltinBodyProps) {
  return <CardUtilisationWidget accountId={stringParam(params, 'accountId')} className={className} />;
}

function AccountTileBody({ params, className }: BuiltinBodyProps) {
  return <AccountTileWidget accountId={stringParam(params, 'accountId')} className={className} />;
}

function EmergencyFundBody({ className }: BuiltinBodyProps) {
  return <EmergencyFundWidget className={className} />;
}

export const CARDS_SPENDING_ENTRIES: GroupEntries = {
  card_utilisation: {
    Body: CardUtilisationBody,
    phone: CONTENT,
    subtitle: cardSubtitle('All cards'),
  },
  milestone_progress: {
    phone: CONTENT,
    subtitle: cardSubtitle(null),
  },
  cap_headroom: {
    phone: CONTENT,
    subtitle: cardSubtitle(null),
  },
  rewards_earned: {
    phone: CONTENT,
  },
  spend_heatmap: {
    phone: { fit: 'fill', className: 'h-[220px]' },
    subtitle: (widget) => {
      const months = heatmapMonths(widgetParams(widget));
      return `Last ${months} ${months === 1 ? 'month' : 'months'}`;
    },
  },
  account_tile: {
    Body: AccountTileBody,
    phone: CONTENT,
    subtitle: (widget) => {
      const accountId = stringParam(widgetParams(widget), 'accountId');
      return accountId ? createElement(AccountTypeSubtitle, { accountId }) : null;
    },
  },
  emergency_fund: {
    Body: EmergencyFundBody,
    phone: CONTENT,
  },
};

export const CARDS_SPENDING_VIEWS: GroupViews = {
  progress_list: MilestoneProgressView,
  cap_list: CapHeadroomView,
  rewards_fy: RewardsEarnedView,
  heatmap: SpendHeatmapView,
};
