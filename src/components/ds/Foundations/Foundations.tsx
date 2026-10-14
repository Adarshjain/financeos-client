import React from 'react';

export function FoundationsColours() {
  const grounds = [
    { name: 'bg-canvas', desc: 'App ground behind cards and lists', className: 'bg-canvas border border-line' },
    { name: 'bg-surface', desc: 'Cards, sheets, dialogs, menus, inputs', className: 'bg-surface border border-line' },
    { name: 'bg-sunken', desc: 'Table headers, section bands, footers', className: 'bg-sunken border border-line' },
    { name: 'bg-subtle', desc: 'Sticky date headers, category chip fill', className: 'bg-subtle border border-line' },
    { name: 'bg-hover', desc: 'Hover and pressed state for rows', className: 'bg-hover border border-line' },
    { name: 'scrim', desc: 'Overlay behind sheets and dialogs', className: 'bg-scrim border border-line' },
  ];

  const lines = [
    { name: 'line', desc: 'Card and menu borders, hairlines', className: 'bg-line' },
    { name: 'line-soft', desc: 'Dividers inside cards, neutral badge', className: 'bg-line-soft' },
    { name: 'line-strong', desc: 'Borders of interactive controls', className: 'bg-line-strong' },
    { name: 'line-handle', desc: 'Sheet handle, switch track when off', className: 'bg-line-handle' },
  ];

  const ink = [
    { name: 'ink', desc: 'Primary text and amounts', className: 'text-ink' },
    { name: 'ink-2', desc: 'Labels and secondary values', className: 'text-ink-2' },
    { name: 'ink-3', desc: 'Secondary lines, card subtitles', className: 'text-ink-3' },
    { name: 'ink-4', desc: 'Placeholders, table headers, overlines', className: 'text-ink-4' },
    { name: 'ink-faint', desc: 'Disabled marks and watermarks', className: 'text-ink-faint' },
  ];

  const brand = [
    { name: 'brand', desc: 'Primary action and selected state', bgClass: 'bg-brand', textClass: 'text-on-brand' },
    { name: 'brand-strong', desc: 'Hover on primary action', bgClass: 'bg-brand-strong', textClass: 'text-on-brand' },
    { name: 'brand-tint', desc: 'Row selection tint', bgClass: 'bg-brand-tint', textClass: 'text-brand' },
    { name: 'brand-border', desc: 'Border for selection states', bgClass: 'bg-brand-border', textClass: 'text-ink' },
  ];

  const status = [
    { name: 'positive', label: 'Positive (money in)', className: 'bg-positive text-on-brand' },
    { name: 'positive-strong', label: 'Positive strong (hover/accent)', className: 'bg-positive-strong text-on-brand' },
    { name: 'positive-tint', label: 'Positive tint', className: 'bg-positive-tint text-positive-strong border border-line' },
    { name: 'danger', label: 'Danger (destructive)', className: 'bg-danger text-on-brand' },
    { name: 'danger-tint', label: 'Danger tint', className: 'bg-danger-tint text-danger-ink border border-danger-border' },
    { name: 'warning', label: 'Warning (needs you)', className: 'bg-warning text-on-brand' },
    { name: 'warning-tint', label: 'Warning tint', className: 'bg-warning-tint text-warning-ink border border-warning-border' },
    { name: 'watch', label: 'Watch (monitored)', className: 'bg-watch text-on-brand' },
    { name: 'watch-tint', label: 'Watch tint', className: 'bg-watch-tint text-ink border border-line' },
    { name: 'info', label: 'Info (connected)', className: 'bg-info text-on-brand' },
    { name: 'info-tint', label: 'Info tint', className: 'bg-info-tint text-info-ink' },
  ];

  const series = [
    { name: 'series-1', className: 'bg-series-1 text-on-brand' },
    { name: 'series-2', className: 'bg-series-2 text-on-brand' },
    { name: 'series-3', className: 'bg-series-3 text-on-brand' },
    { name: 'series-4', className: 'bg-series-4 text-on-brand' },
    { name: 'series-5', className: 'bg-series-5 text-on-brand' },
    { name: 'series-rest', className: 'bg-series-rest text-on-brand' },
  ];

  return (
    <div className="space-y-space-32 max-w-4xl">
      <div>
        <h2 className="text-title text-ink font-text">Colours</h2>
        <p className="text-caption text-ink-3">All colours are driven by tokens. Contrast holds 4.5:1 across light and dark.</p>
      </div>

      <section className="space-y-space-12">
        <h3 className="text-overline uppercase text-ink-4">Grounds</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-space-12">
          {grounds.map((g) => (
            <div key={g.name} className="p-space-12 rounded-ds-md border border-line bg-surface space-y-space-8">
              <div className={`h-control-xl rounded-ds-sm ${g.className}`} />
              <div>
                <p className="text-label text-ink">{g.name}</p>
                <p className="text-caption text-ink-3">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-space-12">
        <h3 className="text-overline uppercase text-ink-4">Lines & Borders</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-12">
          {lines.map((l) => (
            <div key={l.name} className="p-space-12 rounded-ds-md border border-line bg-surface space-y-space-8">
              <div className={`h-space-8 rounded-ds-xs ${l.className}`} />
              <div>
                <p className="text-label text-ink">{l.name}</p>
                <p className="text-caption text-ink-3">{l.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-space-12">
        <h3 className="text-overline uppercase text-ink-4">Ink (Text)</h3>
        <div className="p-space-16 rounded-ds-lg border border-line bg-surface space-y-space-12">
          {ink.map((item) => (
            <div key={item.name} className="flex items-center justify-between border-b border-line-soft pb-space-8">
              <span className={`text-body ${item.className}`}>{item.name} — {item.desc}</span>
              <span className={`text-body-strong ${item.className}`}>₹11,98,842</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-space-12">
        <h3 className="text-overline uppercase text-ink-4">Brand & Action</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-12">
          {brand.map((b) => (
            <div key={b.name} className={`p-space-12 rounded-ds-md border border-line ${b.bgClass} ${b.textClass} space-y-space-4`}>
              <p className="text-label">{b.name}</p>
              <p className="text-caption">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-space-12">
        <h3 className="text-overline uppercase text-ink-4">Status (Word in colour)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-space-12">
          {status.map((s) => (
            <div key={s.name} className={`p-space-12 rounded-ds-md ${s.className}`}>
              <p className="text-label">{s.name}</p>
              <p className="text-caption">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-space-12">
        <h3 className="text-overline uppercase text-ink-4">Chart Series</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-space-8">
          {series.map((item) => (
            <div key={item.name} className={`p-space-12 rounded-ds-md text-center ${item.className}`}>
              <p className="text-label">{item.name}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function FoundationsTypography() {
  const styles = [
    { name: 'text-hero-figure', font: 'font-display', cls: 'text-hero-figure font-display', sample: '₹11,98,842', desc: 'Display 30/34 w800 -0.02em · One headline number per screen' },
    { name: 'text-page-title', font: 'font-display', cls: 'text-page-title font-display', sample: 'Good afternoon, Arjun', desc: 'Display 24/30 w800 -0.015em · Desktop page title' },
    { name: 'text-screen-title', font: 'font-display', cls: 'text-screen-title font-display', sample: "You're offline", desc: 'Display 20/26 w700 -0.01em · Headlines on empty, auth, offline' },
    { name: 'text-figure', font: 'font-text', cls: 'text-figure font-text', sample: '₹97,044', desc: 'Text 22/28 w800 -0.02em · KPI tile values' },
    { name: 'text-title', font: 'font-text', cls: 'text-title font-text', sample: 'Edit transaction', desc: 'Text 17/22 w800 -0.01em · App bar, sheets, dialogs' },
    { name: 'text-heading', font: 'font-text', cls: 'text-heading font-text', sample: 'Needs you', desc: 'Text 14/20 w800 · Card titles, rule names' },
    { name: 'text-body', font: 'font-text', cls: 'text-body font-text', sample: 'Amex Platinum bill · 15 Oct', desc: 'Text 13/18 w500 · Default interface text' },
    { name: 'text-body-strong', font: 'font-text', cls: 'text-body-strong font-text', sample: '₹1,249.00', desc: 'Text 13/18 w700 · Emphasised values, row amounts' },
    { name: 'text-label', font: 'font-text', cls: 'text-label font-text', sample: 'Statement password', desc: 'Text 12/16 w600 · Buttons, chips, field labels' },
    { name: 'text-caption', font: 'font-text', cls: 'text-caption font-text', sample: 'HDFC Regalia ••7741 · Unreconciled', desc: 'Text 11/14 w500 · Row context, badges, helper text' },
    { name: 'text-overline', font: 'font-text', cls: 'text-overline uppercase font-text', sample: 'CARD DETAILS', desc: 'Text 10/12 w800 +0.08em · Section bands, rail headers' },
    { name: 'text-tab-label', font: 'font-text', cls: 'text-tab-label font-text', sample: 'Transactions', desc: 'Text 10/12 w700 · Phone tab bar labels' },
  ];

  return (
    <div className="space-y-space-24 max-w-4xl">
      <div>
        <h2 className="text-title text-ink font-text">Typography</h2>
        <p className="text-caption text-ink-3">Figtree for interface text, Bricolage Grotesque for display moments only.</p>
      </div>

      <div className="p-space-16 rounded-ds-lg border border-line bg-surface space-y-space-20">
        {styles.map((item) => (
          <div key={item.name} className="border-b border-line-soft pb-space-16 last:border-b-0 space-y-space-4">
            <div className="flex items-baseline justify-between">
              <span className="text-caption text-ink-4">{item.name} · {item.desc}</span>
            </div>
            <div className={`${item.cls} text-ink`}>
              {item.sample}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FoundationsSpacing() {
  const steps = [
    { name: 'space-2', val: '2px', cls: 'w-space-2' },
    { name: 'space-4', val: '4px', cls: 'w-space-4' },
    { name: 'space-6', val: '6px', cls: 'w-space-6' },
    { name: 'space-8', val: '8px', cls: 'w-space-8' },
    { name: 'space-10', val: '10px', cls: 'w-space-10' },
    { name: 'space-12', val: '12px', cls: 'w-space-12' },
    { name: 'space-14', val: '14px', cls: 'w-space-14' },
    { name: 'space-16', val: '16px', cls: 'w-space-16' },
    { name: 'space-20', val: '20px', cls: 'w-space-20' },
    { name: 'space-24', val: '24px', cls: 'w-space-24' },
    { name: 'space-28', val: '28px', cls: 'w-space-28' },
    { name: 'space-32', val: '32px', cls: 'w-space-32' },
    { name: 'space-40', val: '40px', cls: 'w-space-40' },
    { name: 'space-48', val: '48px', cls: 'w-space-48' },
  ];

  return (
    <div className="space-y-space-24 max-w-4xl">
      <div>
        <h2 className="text-title text-ink font-text">Spacing</h2>
        <p className="text-caption text-ink-3">Spacing uses token steps space-2 to space-48. Phone gutter is 14px; desktop gutter is 28px.</p>
      </div>

      <div className="p-space-16 rounded-ds-lg border border-line bg-surface space-y-space-12">
        {steps.map((s) => (
          <div key={s.name} className="flex items-center gap-space-16">
            <span className="w-space-48 text-label text-ink-3">{s.name}</span>
            <span className="w-space-32 text-caption text-ink-4">{s.val}</span>
            <div className={`h-space-8 bg-brand rounded-ds-xs ${s.cls}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FoundationsRadii() {
  const radii = [
    { name: 'rounded-ds-xs', val: '4px', desc: 'Tiny keys, bar segments', cls: 'rounded-ds-xs' },
    { name: 'rounded-ds-sm', val: '6px', desc: 'Badges, small tags', cls: 'rounded-ds-sm' },
    { name: 'rounded-ds-md', val: '8px', desc: 'Controls, buttons, inputs', cls: 'rounded-ds-md' },
    { name: 'rounded-ds-lg', val: '12px', desc: 'Cards, menus, dropdowns', cls: 'rounded-ds-lg' },
    { name: 'rounded-ds-xl', val: '14px', desc: 'Record cards, dialogs', cls: 'rounded-ds-xl' },
    { name: 'rounded-ds-sheet', val: '22px', desc: 'Phone bottom sheet top corners', cls: 'rounded-ds-sheet' },
    { name: 'rounded-ds-pill', val: '999px', desc: 'Chips, search bars, pills', cls: 'rounded-ds-pill' },
  ];

  return (
    <div className="space-y-space-24 max-w-4xl">
      <div>
        <h2 className="text-title text-ink font-text">Radii</h2>
        <p className="text-caption text-ink-3">Rounded corners use tokens: ds-xs (4px) to ds-pill (999px).</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-16">
        {radii.map((r) => (
          <div key={r.name} className={`p-space-16 border border-line-strong bg-surface ${r.cls} space-y-space-4`}>
            <p className="text-label text-ink">{r.name}</p>
            <p className="text-caption text-ink-3">{r.val} · {r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FoundationsShadows() {
  const shadows = [
    { name: 'shadow-pop', desc: 'Menus, dropdowns, desktop selection bar', cls: 'shadow-pop' },
    { name: 'shadow-dialog', desc: 'Desktop modal dialogs', cls: 'shadow-dialog' },
    { name: 'shadow-sheet', desc: 'Phone bottom sheets', cls: 'shadow-sheet' },
    { name: 'shadow-dock', desc: 'Phone selection bar docked to bottom', cls: 'shadow-dock' },
    { name: 'shadow-raise', desc: 'Auth illustration tiles only', cls: 'shadow-raise' },
  ];

  return (
    <div className="space-y-space-24 max-w-4xl">
      <div>
        <h2 className="text-title text-ink font-text">Shadows</h2>
        <p className="text-caption text-ink-3">Borders separate; shadows mean floating. Cards never carry shadows.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-24">
        {shadows.map((s) => (
          <div key={s.name} className={`p-space-20 rounded-ds-lg border border-line bg-surface ${s.cls} space-y-space-4`}>
            <p className="text-heading text-ink">{s.name}</p>
            <p className="text-caption text-ink-3">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FoundationsAll() {
  return (
    <div className="space-y-space-48">
      <FoundationsColours />
      <FoundationsTypography />
      <FoundationsSpacing />
      <FoundationsRadii />
      <FoundationsShadows />
    </div>
  );
}
