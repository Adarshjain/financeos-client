#!/usr/bin/env node
// Design-system guard (design-system/RULES.md §10). Scans the lines a change ADDS under src/
// and fails on anything that bypasses the tokens: colour literals, Tailwind palette classes,
// arbitrary values, raw font sizes, non-token shadows, native date inputs, Google fonts,
// and colour/type in inline styles. Existing code is not scanned until a change touches it.
//
// Usage:
//   node design-system/tools/check-ui.mjs                 # working tree + staged vs HEAD, plus new files
//   node design-system/tools/check-ui.mjs --base main~3   # everything added since a ref
//   node design-system/tools/check-ui.mjs --staged        # only what is staged (for the pre-commit hook)
//   node design-system/tools/check-ui.mjs --self-test     # prove the rules catch what they should
//
// A line may opt out with a comment containing `ds-allow: <reason>`. Opt-outs are printed as
// warnings and must be listed as deviations in design-system/PROGRESS.md with an owner decision.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

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
    why: 'arbitrary value — use a token step (grid-cols/grid-rows templates are the only exception)',
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
    id: 'inline-style',
    re: /style=\{\{[^}]*\b(?:color|background(?:Color)?|fontSize|fontWeight|boxShadow|borderColor|fontFamily)\s*:/,
    why: 'colour or type in an inline style — use tokens and type styles',
  },
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

function check(lines) {
  const errors = [];
  const allowed = [];
  for (const { file, line, text } of lines) {
    if (!SCAN_EXT.test(file) || SKIP.some((re) => re.test(file))) continue;
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
  ];
  let fail = 0;
  for (const [rule, text] of bad) {
    const { errors } = check([{ file: 'src/x.tsx', line: 1, text }]);
    if (!errors.some((e) => e.rule === rule)) {
      console.log(`MISSED ${rule}: ${text}`);
      fail++;
    }
  }
  for (const text of good) {
    const { errors } = check([{ file: 'src/x.tsx', line: 1, text }]);
    if (errors.length) {
      console.log(`FALSE POSITIVE ${errors.map((e) => e.rule)}: ${text}`);
      fail++;
    }
  }
  console.log(
    fail
      ? `self-test: ${fail} problem(s)`
      : `self-test: ${bad.length} catches, ${good.length} clean lines, all correct`
  );
  process.exit(fail ? 1 : 0);
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) selfTest();
const bi = args.indexOf('--base');
const base = bi >= 0 ? args[bi + 1] : 'HEAD';
const { errors, allowed } = check(addedLines(base, args.includes('--staged')));
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
