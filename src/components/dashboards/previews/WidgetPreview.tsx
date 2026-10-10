// The picker's static preview of a built-in, keyed by builtinKey: a small
// mock-up drawn from hard-coded sample data (nothing is fetched), captioned
// "Preview · sample data" above its frame. A key without a preview of its own
// gets a neutral placeholder.

import { type ComponentType, createElement } from 'react';

import {
  AllocationPreview,
  CapHeadroomPreview,
  CardUtilisationPreview,
  LendingBalancesPreview,
  LoanPayoffPreview,
  MilestoneProgressPreview,
  PortfolioSnapshotPreview,
  RewardsEarnedPreview,
  TaxHarvestPreview,
  TopMoversPreview,
} from './moneyPreviews';
import {
  AccountTilePreview,
  AttentionPreview,
  BillsDuePreview,
  EmergencyFundPreview,
  NetWorthPreview,
  ShortcutsPreview,
  SpendHeatmapPreview,
  UpcomingPreview,
} from './overviewPreviews';
import { mutedText } from './previewKit';

export const WIDGET_PREVIEWS: Readonly<Record<string, ComponentType>> = {
  net_worth: NetWorthPreview,
  attention: AttentionPreview,
  upcoming: UpcomingPreview,
  bills_due: BillsDuePreview,
  card_utilisation: CardUtilisationPreview,
  milestone_progress: MilestoneProgressPreview,
  cap_headroom: CapHeadroomPreview,
  portfolio_snapshot: PortfolioSnapshotPreview,
  top_movers: TopMoversPreview,
  allocation: AllocationPreview,
  tax_harvest: TaxHarvestPreview,
  spend_heatmap: SpendHeatmapPreview,
  loan_payoff: LoanPayoffPreview,
  lending_balances: LendingBalancesPreview,
  account_tile: AccountTilePreview,
  emergency_fund: EmergencyFundPreview,
  rewards_earned: RewardsEarnedPreview,
  shortcuts: ShortcutsPreview,
};

/** The placeholder for a built-in the client has no preview for. */
export function GenericPreview() {
  return (
    <div className="space-y-2" data-testid="generic-preview">
      <div className="h-3 w-2/5 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-2 w-4/5 rounded bg-slate-100 dark:bg-slate-800" />
      <div className="h-2 w-3/5 rounded bg-slate-100 dark:bg-slate-800" />
      <p className={mutedText}>No preview for this widget yet.</p>
    </div>
  );
}

/** The preview component for a key, else the generic placeholder. */
export function previewFor(key: string): ComponentType {
  return Object.hasOwn(WIDGET_PREVIEWS, key) ? WIDGET_PREVIEWS[key] : GenericPreview;
}

/** The captioned, framed preview of a built-in. */
export function WidgetPreview({ builtinKey }: { builtinKey: string }) {
  return (
    <figure className="space-y-1.5">
      <figcaption className="text-2xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Preview · sample data
      </figcaption>
      <div
        data-testid="widget-preview-frame"
        aria-hidden="true"
        className="pointer-events-none select-none rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        {createElement(previewFor(builtinKey))}
      </div>
    </figure>
  );
}
