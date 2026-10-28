#!/usr/bin/env node
// Design-system guard (design-system/RULES.md §10). Scans the lines a change ADDS under src/
// and fails on anything that bypasses the tokens: colour literals, Tailwind palette classes,
// arbitrary values, raw font sizes, non-token shadows, native date inputs, Google fonts,
// colour/type in inline styles, and class names Tailwind does not know (it drops them silently).
// Existing code is not scanned until a change touches it.
//
// Usage:
//   node design-system/tools/check-ui.mjs                 # working tree + staged vs HEAD, plus new files
//   node design-system/tools/check-ui.mjs --base main~3   # everything added since a ref
//   node design-system/tools/check-ui.mjs --staged        # only what is staged (for the pre-commit hook)
//   node design-system/tools/check-ui.mjs --all           # ignore checked-paths.txt, check all of src/
//   node design-system/tools/check-ui.mjs --self-test     # prove the rules catch what they should
//
// Only files under the prefixes in design-system/checked-paths.txt are checked (the new
// component library, then each migrated page). `--all` checks every file under src/.
//
// A line may opt out with a comment containing `ds-allow: <reason>`. Opt-outs are printed as
// warnings and must be listed as deviations in design-system/PROGRESS.md with an owner decision.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const SCOPE = existsSync('design-system/checked-paths.txt')
  ? readFileSync('design-system/checked-paths.txt', 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  : ['src/'];

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black';
const COLOR_UTIL =
  'bg|text|border|border-[trblxy]|ring|ring-offset|fill|stroke|from|via|to|outline|divide|placeholder|accent|caret|decoration|shadow';

const RULES = [
  {
    id: 'hex-colour',
    re: /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b(?![\w-])/,
    why: 'colour literal — use a token',
  },
  {
    id: 'fn-colour',
    re: /\b(?:rgba?|hsla?)\((?!\s*var\()/,
    why: 'colour function literal — use a token',
  },
  {
    id: 'palette-class',
    re: new RegExp(
      `(?:^|[\\s"'\`:])(?:${COLOR_UTIL})-(?:${PALETTE})(?:-\\d{2,3})?(?:/\\d+)?(?=[\\s"'\`]|$)`
    ),
    why: 'Tailwind palette class — use the token names from PROGRESS.md Phase 1',
  },
  {
    id: 'arbitrary-value',
    re: /(?:^|[\s"'`:])(?!grid-cols-|grid-rows-)[a-z][\w-]*-\[[^\]]+\]/,
    why: 'arbitrary value — use a token step (grid-cols/grid-rows templates are the only exception; for Radix state use data-open:, data-highlighted:… from the Phase 1 contract)',
  },
  {
    id: 'raw-font-size',
    re: /(?:^|[\s"'`:])text-(?:2xs|xs|sm|base|lg|xl|[2-9]xl)(?=[\s"'`]|$)/,
    why: 'raw font size — use a type style (text-body, text-caption, …)',
  },
  {
    id: 'font-weight',
    re: /(?:^|[\s"'`:])font-(?:thin|extralight|light|normal|black)(?=[\s"'`]|$)/,
    why: 'weight outside 500–800',
  },
  {
    id: 'raw-shadow',
    re: /(?:^|[\s"'`:])shadow-(?:sm|md|lg|xl|2xl|inner)(?=[\s"'`]|$)/,
    why: 'non-token shadow — use shadow-pop/dialog/sheet/dock/raise, and none on cards',
  },
  {
    id: 'native-date',
    re: /type\s*=\s*\{?\s*["']date["']/,
    why: 'native date input — use DateInput (dd/mm/yyyy)',
  },
  {
    id: 'google-font',
    re: /next\/font\/google/,
    why: 'Google-hosted font — self-host with next/font/local',
  },
  {
    id: 'inline-size',
    re: /(?:\b(?:width|height|minWidth|minHeight|maxWidth|maxHeight|padding\w*|margin\w*|gap|top|left|right|bottom|inset|borderRadius|borderWidth)\s*:\s*(?:-?\d+(?:\.\d+)?\s*[,}\n]|['"`]-?\d+(?:\.\d+)?px))/,
    why: 'fixed pixel size in an inline style — use a size or space token class (dynamic values like percentages are fine)',
  },
  {
    id: 'inline-style',
    re: /style=\{\{[^}]*\b(?:color|background(?:Color)?|fontSize|fontWeight|boxShadow|borderColor|fontFamily)\s*:/,
    why: 'colour or type in an inline style — use tokens and type styles',
  },
];

const REMOVED_API = [
  [/\bCategoryChip\b/, 'CategoryChip was merged into Badge (audit G2)'],
  [/\bFilterChipRow\b/, 'FilterChipRow was deleted; lay out chip rows with layout classes (audit G3)'],
  [/\b(?:ResponsiveOverlay|forcePhone|forceSheet|forcePopover|asDropdownMenu)\b/, 'dropdowns never become sheets; ResponsiveOverlay and its flags are gone (audit G5)'],
  [/\bvariant=["'{]?["']?(?:tile|google|amber|count)["']/, 'removed variant: tile/google (audit G11), amber (G3), count (G2)'],
  [/\biconPosition\b/, 'iconPosition was replaced by Button layout="inline|stacked" (audit G11)'],
  [/\b(?:onUndo|undoLabel|onRetry|retryLabel|removeLabel|actionRow|onActionClick)\b/, 'one action shape: action={{ label, onSelect }} (audit G6)'],
  [/@deprecated|\b[Ll]egacy (?:alias|year|prop)|for (?:backward )?compatibility/, 'no aliases or compatibility shims: one name per prop (RULES §5c.8); update the callers instead'],
];
const LEGACY_FORMATTERS = /\bimport\b[^;]*\b(?:formatMoney|formatCurrency|formatNumber|formatNullableMoney|formatDate|formatRelativeTime|formatMonthYear)\b[^;]*from ['"]@\/lib\/utils['"]/;
const STORY_RULES = [
  ['story-callback', /=>\s*\{\s*\}|\balert\(|\bconsole\.(?:log|info|warn)\(/, 'stories log callbacks with fn() from storybook/test (RULES §5a.3)'],
  ['story-import', /from ['"]\.\.?\//, 'stories import from @/components/ds or @/components/organisms (RULES §5a.5)'],
  ['story-play', /\bplay\s*:/, 'no play functions in stories (RULES §5a.8)'],
  ['story-allvariants', /\bAllVariants\b|All variants/, 'no All variants story; autodocs shows every story (RULES §5a.1)'],
  ['story-styling', /\bstyle=\{\{/, 'inline style in a story (RULES §5a.4)'],
];

const SCAN_EXT = /\.(?:tsx?|jsx?|css)$/;
const SKIP = [
  /^src\/app\/globals\.css$/,
  /\/__tests__\//,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /^src\/lib\/api\//,
];

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function addedLines(base, staged) {
  const out = [];
  const diff = git(
    staged
      ? ['diff', '--cached', '--unified=0', '--no-color', '--', 'src']
      : ['diff', '--unified=0', '--no-color', base, '--', 'src']
  );
  let file = null;
  let line = 0;
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) {
      file = l.slice(4).replace(/^b\//, '');
      continue;
    }
    const h = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (h) {
      line = Number(h[1]);
      continue;
    }
    if (file && l.startsWith('+') && !l.startsWith('+++')) {
      out.push({ file, line, text: l.slice(1) });
      line++;
    }
  }
  if (staged) return out;
  const untracked = git([
    'ls-files',
    '--others',
    '--exclude-standard',
    '--',
    'src',
  ])
    .split('\n')
    .filter(Boolean);
  for (const f of untracked) {
    if (!existsSync(f)) continue;
    readFileSync(f, 'utf8')
      .split('\n')
      .forEach((text, i) => out.push({ file: f, line: i + 1, text }));
  }
  return out;
}


// Unknown Tailwind classes: a class that matches no utility in tailwind.config.ts is silently
// dropped by Tailwind (e.g. `px-space-18`, `bg-ink` when ink is only a text colour). Every
// utility-looking token inside a string on an added line is run through Tailwind's own engine.
const UTIL_PREFIX =
  /^(?:!?[a-z0-9-]+:)*!?-?(?:p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|gap-x|gap-y|space-x|space-y|w|h|min-w|min-h|max-w|max-h|size|text|bg|border|border-[trblxy]|rounded|rounded-[trbl]{1,2}|shadow|z|font|leading|tracking|ring|ring-offset|outline|fill|stroke|top|left|right|bottom|inset|inset-x|inset-y|translate-x|translate-y|duration|ease|opacity|grid-cols|grid-rows|col-span|row-span|items|justify|self|content|place-items|place-content|overflow|overflow-x|overflow-y|whitespace|line-clamp|basis|order|decoration|underline-offset|accent|caret|divide|from|to|via|scale|rotate|aspect|columns|object|cursor|select|pointer-events|list|align|break|transition|animate|backdrop|blur|delay)-/;
let twCtx = null;
function twKnows(cls) {
  if (!twCtx) {
    const req = createRequire(import.meta.url);
    const root = process.cwd() + '/';
    const loadConfig = req(root + 'node_modules/tailwindcss/loadConfig.js');
    const resolveConfig = req(root + 'node_modules/tailwindcss/resolveConfig.js');
    const { createContext } = req(root + 'node_modules/tailwindcss/lib/lib/setupContextUtils.js');
    twCtx = { ctx: createContext(resolveConfig(loadConfig(root + 'tailwind.config.ts'))), gen: req(root + 'node_modules/tailwindcss/lib/lib/generateRules.js').generateRules };
  }
  return twCtx.gen(new Set([cls]), twCtx.ctx).length > 0;
}
function unknownClasses(text) {
  const out = [];
  // A string followed directly by `:` is an object key (e.g. a tailwind-merge group name), not classes.
  for (const m of text.matchAll(/(["'`])([^"'`]*)\1(:?)/g)) {
    if (m[3]) continue;
    for (const c of m[2].split(/\s+/)) {
      if (!c || !UTIL_PREFIX.test(c) || /[{}$]/.test(c) || c === 'list-bullets') continue;
      if (!twKnows(c)) out.push(c);
    }
  }
  return out;
}

// Components that may render a raw <button>: the primitives that ARE buttons or
// button-like controls. Every other design-system component uses Button (RULES §5b.2).
const RAW_BUTTON_OK = new Set(['Button', 'Switch', 'Checkbox', 'Radio', 'FilterChip', 'Badge', 'SegmentedControl', 'Tabs', 'Menu', 'Select', 'Popover', 'Dialog']);
// Icons in the new system are Phosphor through the Icon component (RULES §6.1). The rule
// switches on once @phosphor-icons/react is a dependency, so the Lucide-based Icon keeps
// working until the migration round installs it.
const PHOSPHOR = (() => {
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    return Boolean({ ...pkg.dependencies, ...pkg.devDependencies }['@phosphor-icons/react']);
  } catch {
    return false;
  }
})();
function dsComponent(file) {
  const m = /^src\/components\/ds\/([A-Za-z]+)\/([A-Za-z]+)\.tsx$/.exec(file);
  return m && m[1] === m[2] ? m[1] : null;
}

function check(lines, all = false, classes = true) {
  const errors = [];
  const allowed = [];
  for (const [idx, { file, line, text }] of lines.entries()) {
    if (!SCAN_EXT.test(file) || SKIP.some((re) => re.test(file))) continue;
    if (!all && !SCOPE.some((p) => file.startsWith(p))) continue;
    for (const r of RULES) {
      if (!r.re.test(text)) continue;
      const hit = {
        file,
        line,
        rule: r.id,
        why: r.why,
        text: text.trim().slice(0, 160),
      };
      (/ds-allow:/.test(text) ? allowed : errors).push(hit);
    }
    if (/^src\/(?:app\/\(ds\)|features\/shell)\//.test(file) && /\.tsx$/.test(file) && !/\.(?:test|stories)\.tsx$/.test(file)) {
      if (/\bstyle=\{/.test(text)) {
        errors.push({ file, line, rule: 'page-styling', why: 'inline `style` in a page or the shell — use a Dinero component prop or flag the gap (RULES §5d)', text: text.trim().slice(0, 160) });
      }
      if (/\bmodal=\{false\}/.test(text)) {
        errors.push({ file, line, rule: 'page-styling', why: '`modal={false}` removes the scrim; Dialog is always modal (RULES §5.6)', text: text.trim().slice(0, 160) });
      }
      for (const m of text.matchAll(/className=(?:\{[^}]*?)?["'`]([^"'`]+)["'`]/g)) {
        for (const c of m[1].split(/\s+/)) {
          const base = c.replace(/^(?:[a-z0-9-]+:)+/, '');
          if (/^(?:text-|font-|bg-|border|rounded|shadow|opacity-|ring|underline|no-underline|decoration|italic|uppercase|lowercase|capitalize|tracking-|leading-|fill-|stroke-|divide-|outline)/.test(base)) {
            errors.push({ file, line, rule: 'page-styling', why: `\`${c}\` styles a page element by hand — use a Dinero component (Text, Button link, …) or flag the gap (RULES §5d)`, text: text.trim().slice(0, 160) });
          }
        }
      }
    }
    const comp = dsComponent(file);
    // phoneLayout.ts is the one place that may read the layout, and only inside event handlers (RULES §5c.3).
    if (file !== 'src/components/ds/phoneLayout.ts' && /\b(?:useMediaQuery|useIsPhone|useIsDesktop|matchMedia|innerWidth)\b/.test(text)) {
      errors.push({ file, line, rule: 'viewport-js', why: 'viewport detected in JavaScript — use desk: breakpoint classes; there are no exceptions (RULES §5c.3)', text: text.trim().slice(0, 160) });
    }
    // Dinero has one layout switch, `desk` (641px); Legacy's sm/md/lg/xl breakpoints never appear in checked code (RULES §5c.2).
    if (/(?:^|[\s"'`:])(?:max-)?(?:sm|md|lg|xl|2xl):[-a-z![]/.test(text)) {
      errors.push({ file, line, rule: 'breakpoint', why: 'a breakpoint other than desk: — Dinero has one switch at 641px (RULES §5c.2)', text: text.trim().slice(0, 160) });
    }
    // APIs removed by the 2026-10 audit (design-system/specs/audit/00-global.md). Re-adding any of them is a regression.
    for (const [re, why] of REMOVED_API) {
      if (re.test(text)) errors.push({ file, line, rule: 'removed-api', why, text: text.trim().slice(0, 160) });
    }
    if (/^src\/components\/(?:ds|organisms)\//.test(file) && !/\.stories\.tsx$/.test(file) && /['"`]20\d\d-\d\d-\d\d['"`]|\?\?\s*20\d\d\b/.test(text)) {
      errors.push({ file, line, rule: 'removed-api', why: 'a hard-coded date in a component: dates come from props (today from the app, G10)', text: text.trim().slice(0, 160) });
    }
    // An import may span lines: the whole statement (from its `import {` line to its `from` line) is tested once.
    if (/^\s*import\b/.test(text)) {
      let stmt = text;
      for (let j = idx + 1; j < lines.length && !/\bfrom\s+['"]/.test(stmt) && lines[j].file === file && lines[j].line === lines[j - 1].line + 1; j++) {
        stmt += '\n' + lines[j].text;
      }
      if (LEGACY_FORMATTERS.test(stmt)) {
        errors.push({ file, line, rule: 'legacy-format', why: "Legacy formatter from '@/lib/utils' — format through '@/lib/format' (RULES §4.4)", text: text.trim().slice(0, 160) });
      }
    }
    if (/^src\/components\/ds\//.test(file) && /from ['"]@\/components\/organisms/.test(text)) {
      errors.push({ file, line, rule: 'ds-imports-organism', why: 'Dinero never imports organisms (RULES §5b.1)', text: text.trim().slice(0, 160) });
    }
    if (/\.stories\.tsx$/.test(file)) {
      for (const [id, re, why] of STORY_RULES) {
        if (re.test(text)) errors.push({ file, line, rule: id, why, text: text.trim().slice(0, 160) });
      }
      for (const m of text.matchAll(/className=(?:\{[^}]*?)?["'`]([^"'`]+)["'`]/g)) {
        for (const c of m[1].split(/\s+/)) {
          const base = c.replace(/^(?:[a-z0-9-]+:)+/, '');
          if (/^(?:text-|font-|bg-|border|rounded|shadow|opacity-|ring|underline|no-underline|decoration|italic|uppercase|lowercase|capitalize|tracking-|leading-|fill-|stroke-|divide-|outline)/.test(base)) {
            errors.push({ file, line, rule: 'story-styling', why: `\`${c}\` styles story markup by hand — stories render components with layout classes only; frames come from decorators, notes from docs (RULES §5a.4)`, text: text.trim().slice(0, 160) });
          }
        }
      }
    }
    if (comp && /['"](?:phone|desktop|mobile)['"]/.test(text) && /\b(?:variant|layout|mode|form|device)\b/.test(text)) {
      errors.push({ file, line, rule: 'device-prop', why: 'a phone/desktop prop — one structure with desk: classes instead (RULES §5c.1)', text: text.trim().slice(0, 160) });
    }
    if (comp && /\b(?:href|path|to)\s*[:=]\s*\{?\s*['"`]\/[a-z]/.test(text)) {
      errors.push({ file, line, rule: 'hardcoded-route', why: `${comp} hard-codes an app route — routes come from the page or app shell (RULES §5b.6)`, text: text.trim().slice(0, 160) });
    }
    if (comp && /[▾▴✕✓›‹]/.test(text)) {
      const hit = { file, line, rule: 'typed-glyph', why: 'a typed glyph used as an icon — use the Icon component (ChevronDown, X, Check, ChevronRight…)', text: text.trim().slice(0, 160) };
      (/ds-allow:/.test(text) ? allowed : errors).push(hit);
    }
    if (
      !/^src\/components\/ds\/.*\.stories\.tsx$/.test(file) &&
      /from ['"](?:@\/components\/(?!ds\/|ds['"]|organisms\/|organisms['"])|@\/app\/[^'"]*\/components\/)/.test(text)
    ) {
      errors.push({ file, line, rule: 'old-import', why: 'imports old UI — new code uses only src/components/ds; move shared logic (hooks, queries) to src/lib or src/features first (RULES §1.8)', text: text.trim().slice(0, 160) });
    }
    if (PHOSPHOR && /^src\/components\/ds\//.test(file) && /from ['"]lucide-react['"]/.test(text)) {
      errors.push({ file, line, rule: 'lucide-in-ds', why: 'Lucide in the new system — use <Icon name="…" /> (Phosphor, RULES §6.1)', text: text.trim().slice(0, 160) });
    }
    if (/^src\/components\/ds\//.test(file) && !/^src\/components\/ds\/Icon\//.test(file) && /from ['"]@phosphor-icons\//.test(text)) {
      errors.push({ file, line, rule: 'phosphor-direct', why: 'Phosphor imported directly — only the Icon component imports it; use <Icon name="…" />', text: text.trim().slice(0, 160) });
    }
    if (comp && !RAW_BUTTON_OK.has(comp) && /<button(?:[\s>]|$)/.test(text)) {
      const hit = { file, line, rule: 'raw-button', why: `${comp} draws its own <button> — use the Button component (RULES §5b.2)`, text: text.trim().slice(0, 160) };
      (/ds-allow:/.test(text) ? allowed : errors).push(hit);
    }
    if (classes && /\.(?:tsx?|jsx?)$/.test(file)) {
      for (const c of unknownClasses(text)) {
        const hit = { file, line, rule: 'unknown-class', why: `\`${c}\` is not a Tailwind utility in tailwind.config.ts, so it renders nothing — use a contract name (PROGRESS.md Phase 1)`, text: text.trim().slice(0, 160) };
        (/ds-allow:/.test(text) ? allowed : errors).push(hit);
      }
    }
  }
  // Whole-file rule: a Dinero component that uses hooks, event handlers, Radix or Slot must be a
  // client component, or a server page rendering it fails at runtime (RULES §5b.8).
  const seen = new Set();
  for (const { file } of lines) {
    const comp = dsComponent(file);
    if (!comp || seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    if (/^\s*['"]use client['"]/m.test(src)) continue;
    const m = src.match(/\buse(?:State|Effect|Ref|Callback|Memo|Reducer|LayoutEffect|ControllableState|LongPress|Swipe|SheetDrag)\(|\bon[A-Z][A-Za-z]*=\{|from ['"]@radix-ui\/|\bSlot\b/);
    if (m) errors.push({ file, line: 1, rule: 'missing-use-client', why: `${comp} uses \`${m[0]}\` but has no 'use client' — a server page rendering it crashes (RULES §5b.8)`, text: '' });
  }
  return { errors, allowed };
}

function selfTest() {
  const bad = [
    ['hex-colour', '<div className="x" style={{}}>#C5203F</div>'],
    ['fn-colour', 'color: rgba(16,24,40,.16);'],
    ['palette-class', '<div className="bg-slate-50 p-2">'],
    ['palette-class', '<p className="text-rose-600">'],
    ['arbitrary-value', '<div className="p-[13px]">'],
    ['arbitrary-value', '<div className="bg-[#fff]">'],
    ['raw-font-size', '<span className="text-xs">'],
    ['font-weight', '<span className="font-normal">'],
    ['raw-shadow', '<div className="card shadow-md">'],
    ['native-date', '<input type="date" />'],
    ['google-font', "import { Inter } from 'next/font/google';"],
    ['inline-style', '<div style={{ color: x }}>'],
    ['inline-size', '<span style={{ width: 34, height: 20 }}>'],
    ['inline-size', "style={{ maxWidth: '440px' }}"],
  ];
  const good = [
    '<div className="bg-surface border-line text-ink">',
    '<span className="text-caption text-ink-3">',
    '<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-space-10">',
    '<div className="shadow-pop rounded-lg">',
    'background: var(--bg-surface);',
    'color: hsl(var(--foreground));',
    '<DateInput value={v} />',
    '<a href="#section">',
    '<div style={{ width: `${pct}%` }}>',
    '<div style={{ transform: `translateX(${dx}px)` }}>',
  ];
  let fail = 0;
  for (const [rule, text] of bad) {
    const { errors } = check([{ file: 'src/x.tsx', line: 1, text }], true, false);
    if (!errors.some((e) => e.rule === rule)) {
      console.log(`MISSED ${rule}: ${text}`);
      fail++;
    }
  }
  {
    const ml = ['import {', '  formatMoney,', "} from '@/lib/utils';"].map((text, i) => ({ file: 'src/x.tsx', line: i + 1, text }));
    if (!check(ml, true, false).errors.some((e) => e.rule === 'legacy-format')) {
      console.log('MISSED legacy-format: multi-line import');
      fail++;
    }
  }
  for (const text of good) {
    const { errors } = check([{ file: 'src/x.tsx', line: 1, text }], true, false);
    if (errors.length) {
      console.log(`FALSE POSITIVE ${errors.map((e) => e.rule)}: ${text}`);
      fail++;
    }
  }
  for (const [file, text, rule, bad] of [
    ['src/app/(ds)/(app)/transactions/page.tsx', "import { Card } from '@/components/ui/card';", 'old-import', true],
    ['src/app/(ds)/(app)/transactions/page.tsx', "import { useLoanDetail } from '@/app/(legacy)/legacy/(protected)/loans/[id]/components/useLoanDetail';", 'old-import', true],
    ['src/app/(ds)/(app)/transactions/page.tsx', "import { Card } from '@/components/ds';", 'old-import', false],
    ['src/app/(ds)/(app)/transactions/page.tsx', "import { keys } from '@/lib/query';", 'old-import', false],
    ['src/app/(ds)/(public)/login/LoginForm.tsx', '<h1 className="font-text font-extrabold text-heading">', 'page-styling', true],
    ['src/app/(ds)/(public)/login/LoginForm.tsx', '<div className="flex flex-col gap-space-16 desk:p-space-40">', 'page-styling', false],
    ['src/components/ds/Dialog/Dialog.tsx', '<div className="hidden lg:flex">', 'breakpoint', true],
    ['src/components/ds/Dialog/Dialog.tsx', '<div className="max-md:hidden">', 'breakpoint', true],
    ['src/components/ds/Dialog/Dialog.tsx', '<div className="hidden desk:flex max-desk:pb-space-8">', 'breakpoint', false],
    ['src/components/ds/Icon/Icon.tsx', "  lg: 'w-icon-lg h-icon-lg',", 'breakpoint', false],
    ['src/features/shell/ShellNav.tsx', '<div className="text-overline font-extrabold uppercase text-ink-4">', 'page-styling', true],
    ['src/features/shell/ShellNav.tsx', "style={moreOpen ? { zIndex: 30 } : undefined}", 'page-styling', true],
    ['src/features/shell/ShellNav.tsx', '<Dialog open={moreOpen} onOpenChange={setMoreOpen} modal={false}>', 'page-styling', true],
    ['src/components/ds/FilterChip/FilterChip.tsx', '<span>▾</span>', 'typed-glyph', true],
    ['src/components/ds/Pager/Pager.tsx', "  variant?: 'phone' | 'desktop';", 'device-prop', true],
    ['src/components/ds/Dialog/Dialog.tsx', 'const isPhone = useIsPhone();', 'viewport-js', true],
    ['src/components/ds/Select/Select.tsx', 'const isPhone = useIsPhone();', 'viewport-js', true],
    ['src/components/ds/phoneLayout.ts', '  return !window.matchMedia(DESKTOP_QUERY).matches;', 'viewport-js', false],
    ['src/components/ds/useSwipe.ts', '  if (window.matchMedia(DESKTOP_QUERY).matches) return;', 'viewport-js', true],
    ['src/components/ds/Select/Select.tsx', "import { CategoryChip } from '../CategoryChip/CategoryChip';", 'removed-api', true],
    ['src/components/ds/Toast/Toast.tsx', '  onUndo?: () => void;', 'removed-api', true],
    ['src/features/shell/ShellNav.tsx', '<Button variant="tile" iconPosition="top">', 'removed-api', true],
    ['src/features/shell/ShellNav.tsx', '<Button variant="secondary" layout="stacked">', 'removed-api', false],
    ['src/components/ds/Badge/Badge.tsx', "import { RuleCard } from '@/components/organisms';", 'ds-imports-organism', true],
    ['src/components/ds/FilterChip/FilterChip.tsx', '  /** Legacy alias for selected */', 'removed-api', true],
    ['src/components/ds/DateField/DateField.tsx', "      return '2026-10-01';", 'removed-api', true],
    ['src/components/ds/Badge/Badge.stories.tsx', '  args: { onClick: () => {} },', 'story-callback', true],
    ['src/components/ds/Badge/Badge.stories.tsx', '  args: { onClick: fn() },', 'story-callback', false],
    ['src/components/ds/Badge/Badge.stories.tsx', "import { Badge } from './Badge';", 'story-import', true],
    ['src/components/ds/Badge/Badge.stories.tsx', "import { Badge } from '@/components/ds';", 'story-import', false],
    ['src/components/ds/Badge/Badge.stories.tsx', '  play: async ({ canvas }) => {', 'story-play', true],
    ['src/components/ds/Badge/Badge.stories.tsx', 'export const AllVariants: Story = {', 'story-allvariants', true],
    ['src/components/ds/Badge/Badge.stories.tsx', '<span className="font-text text-caption text-ink-3">Soft</span>', 'story-styling', true],
    ['src/components/ds/Badge/Badge.stories.tsx', '<div className="flex gap-space-8">', 'story-styling', false],
    ['src/components/ds/Rail/Rail.tsx', "{ id: 'inbox', label: 'Inbox', href: '/inbox' },", 'hardcoded-route', true],
    ['src/components/ds/Rail/Rail.stories.tsx', "{ id: 'inbox', label: 'Inbox', href: '/inbox' },", 'hardcoded-route', false],
    ['src/components/ds/Card/Card.tsx', '<button type="button">', 'raw-button', true],
    ['src/components/ds/Button/Button.tsx', '<button type="button">', 'raw-button', false],
    ['src/components/ds/Card/Card.stories.tsx', '<button>', 'raw-button', false],
    ['src/features/bills/BillRow.tsx', "import { cn, formatMoney } from '@/lib/utils';", 'legacy-format', true],
    ['src/features/bills/BillRow.tsx', "import { formatDate } from '@/lib/utils';", 'legacy-format', true],
    ['src/features/bills/BillRow.tsx', "import { formatMoney } from '@/lib/format';", 'legacy-format', false],
    ['src/features/bills/BillRow.tsx', "import { cn, toCalendarDate } from '@/lib/utils';", 'legacy-format', false],
  ]) {
    const { errors } = check([{ file, line: 1, text }], true, false);
    if (errors.some((e) => e.rule === rule) !== bad) {
      console.log(`${bad ? 'MISSED' : 'FALSE POSITIVE'} ${rule}: ${file} ${text}`);
      fail++;
    }
  }
  for (const [cls, known] of [
    ['px-space-18', false],
    ['text-small', false],
    ['md:hover:bg-ink', true],
    ['desk:hover:bg-ink', true],
    ['px-space-16', true],
    ['w-control-md', true],
  ]) {
    const { errors } = check([{ file: 'src/x.tsx', line: 1, text: `<div className="flex ${cls}">` }], true);
    if (errors.some((e) => e.rule === 'unknown-class') === known) {
      console.log(`${known ? 'FALSE POSITIVE' : 'MISSED'} unknown-class: ${cls}`);
      fail++;
    }
  }
  console.log(
    fail
      ? `self-test: ${fail} problem(s)`
      : `self-test: ${bad.length + 10} catches, ${good.length + 10} clean lines, all correct`
  );
  process.exit(fail ? 1 : 0);
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) selfTest();
const bi = args.indexOf('--base');
const base = bi >= 0 ? args[bi + 1] : 'HEAD';
const { errors, allowed } = check(
  addedLines(base, args.includes('--staged')),
  args.includes('--all')
);
for (const a of allowed)
  console.log(
    `warning  ${a.file}:${a.line}  ${a.rule} (ds-allow) — list it under Deviations in PROGRESS.md\n         ${a.text}`
  );
for (const e of errors)
  console.log(
    `error    ${e.file}:${e.line}  ${e.rule}: ${e.why}\n         ${e.text}`
  );
console.log(
  errors.length
    ? `\n${errors.length} design-system violation(s). See design-system/RULES.md.`
    : 'design-system check: clean'
);
process.exit(errors.length ? 1 : 0);
