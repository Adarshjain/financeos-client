#!/usr/bin/env node
// Regenerates design-system/tokens.css from design-system/tokens.json.
// Every variable is prefixed --ds- so the new system lives beside the old theme.
// Usage: node design-system/tools/gen-tokens-css.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const T = JSON.parse(readFileSync('design-system/tokens.json', 'utf8'));
const pick = (v, th) => (typeof v === 'string' ? v : (v[th] ?? v.light));
const ref = (v) => {
  const m = /^\{(.+)\}$/.exec(v);
  return m ? `var(--ds-${m[1]})` : v;
};

const L = [
  '/* FinanceOS design tokens — GENERATED from design-system/tokens.json. Do not edit by hand.',
  ' * Every variable is prefixed --ds- so the new system lives beside the existing theme',
  ' * (shadcn --background/--primary/--chart-* etc.) without touching it. */',
  ':root {',
];
for (const t of T.color.tokens) L.push(`  --ds-${t.name}: ${ref(pick(t.value, 'light'))};`);
for (const t of T.shadow.tokens) L.push(`  --ds-${t.name}: ${pick(t.value, 'light')};`);
for (const fam of ['spacing', 'radius', 'size', 'zIndex', 'duration', 'effect'])
  for (const t of T[fam].tokens) L.push(`  --ds-${t.name}: ${t.value};`);
// text and display come from next/font/local; mono is a system stack, so it is a plain variable.
L.push(`  --ds-font-mono: ${T.type.families.mono};`);
L.push('}', '.dark {');
for (const t of T.color.tokens) L.push(`  --ds-${t.name}: ${ref(pick(t.value, 'dark'))};`);
for (const t of T.shadow.tokens) L.push(`  --ds-${t.name}: ${pick(t.value, 'dark')};`);
L.push('}');
L.push(
  '/* Type styles — reference values for the Tailwind fontSize keys text-<style> (font family comes from --ds-font-text / --ds-font-display, set by next/font/local in Phase 1). */',
);
for (const g of T.type.groups)
  for (const s of g.styles) {
    const fam = s.family ?? g.family;
    L.push(
      `/* text-${s.name}: ${fam}, ${s.fontSize}/${s.lineHeight}, ${s.fontWeight}` +
        (s.letterSpacing ? `, tracking ${s.letterSpacing}` : '') +
        (s.name === 'overline' ? ', uppercase' : '') +
        ' */',
    );
  }
writeFileSync('design-system/tokens.css', L.join('\n') + '\n');
console.log(`tokens.css: ${L.filter((l) => l.startsWith('  --ds-')).length} variables`);
