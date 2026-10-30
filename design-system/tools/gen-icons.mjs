// Generates src/components/ds/Icon/icons.generated.ts from design-system/icons.json
// (our name -> Phosphor icon) and the Phosphor defs in node_modules.
// Run: node design-system/tools/gen-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** Names that also ship the solid `fill` weight (everything else is bold only). */
const FILL = new Set(['warning']);

const icons = JSON.parse(fs.readFileSync(path.join(root, 'design-system/icons.json'), 'utf8'));
const pascal = (s) => s.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');

/** Walks a React element tree into [tag, attrs][]; Fragments are flattened. */
function nodes(el) {
  if (el == null || typeof el === 'boolean') return [];
  if (Array.isArray(el)) return el.flatMap(nodes);
  if (typeof el.type === 'symbol') return nodes(el.props.children);
  if (typeof el.type !== 'string') throw new Error(`Unsupported element type: ${String(el.type)}`);
  const { children, ...attrs } = el.props;
  if (children != null) throw new Error(`Unexpected children inside <${el.type}>`);
  return [[el.type, attrs]];
}

const lit = (v) => (typeof v === 'string' ? `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : JSON.stringify(v));
const fmt = (list) =>
  `[${list
    .map(([tag, attrs]) => {
      const a = Object.keys(attrs)
        .sort()
        .map((k) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : lit(k)}: ${lit(attrs[k])}`)
        .join(', ');
      return `['${tag}', { ${a} }]`;
    })
    .join(', ')}]`;

const names = icons.map((i) => i.name);
let out = `// GENERATED FILE. Do not edit by hand.
// Run \`node design-system/tools/gen-icons.mjs\` after changing design-system/icons.json.

export type IconNode = [tag: string, attrs: Record<string, string>];
export interface IconData {
  bold: IconNode[];
  fill?: IconNode[];
}

export type IconName =
${names.map((n) => `  | '${n}'`).join('\n')};

export const iconData: Record<IconName, IconData> = {
`;
for (const { name, phosphor } of icons) {
  const comp = pascal(phosphor);
  const mod = await import(pathToFileURL(path.join(root, `node_modules/@phosphor-icons/react/dist/defs/${comp}.es.js`)).href);
  const map = mod.default;
  const entry = [`bold: ${fmt(nodes(map.get('bold')))}`];
  if (FILL.has(name)) entry.push(`fill: ${fmt(nodes(map.get('fill')))}`);
  out += `  ${/^[A-Za-z_$][\w$]*$/.test(name) ? name : `'${name}'`}: { ${entry.join(', ')} },\n`;
}
out += '};\n';
fs.writeFileSync(path.join(root, 'src/components/ds/Icon/icons.generated.ts'), out);
console.log(`wrote ${icons.length} icons`);
