export type BannerTone =
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'neutral';

export const bannerToneStyles: Record<BannerTone, string> = {
  danger: 'bg-danger-tint text-danger-ink border border-transparent',
  success: 'bg-positive-tint text-positive-strong border border-transparent',
  warning: 'bg-warning-tint text-warning-ink border border-transparent',
  info: 'bg-info-tint text-info-ink border border-transparent',
  neutral: 'bg-surface text-ink-2 border border-line',
};
