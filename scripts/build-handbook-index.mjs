#!/usr/bin/env node
/**
 * Regenerates `public/handbook/search-index.json` from the handbook pages.
 *
 * Run it after editing any handbook HTML or the NAV in `handbook.js`. The index
 * used to be hand-maintained, and headings added later without re-numbering the
 * entries after them sent most search hits from §51 onwards to the wrong
 * subsection.
 *
 * Shape (read by `handbook.js`):
 *   secs:  [page, sectionId, title]           one per NAV section, NAV order
 *   heads: [secIndex, anchorId, title]        each section, then its NAV
 *                                             subsections in page order
 *   items: [headIndex, text]                  every text block (p, h3–h5, li,
 *                                             tr, pre, figcaption, dt, dd,
 *                                             summary, caption) under the
 *                                             nearest preceding head
 * Block text puts a space at every tag boundary and collapses whitespace.
 * Mermaid diagram source is skipped.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/handbook');

const navSource = readFileSync(path.join(root, 'handbook.js'), 'utf8');
const navMatch = navSource.match(/const NAV = (\[.*?\]);\n/s);
if (!navMatch) throw new Error('NAV not found in handbook.js');
const NAV = JSON.parse(navMatch[1]);

const BLOCKS = new Set(['P', 'H3', 'H4', 'H5', 'LI', 'TR', 'PRE', 'FIGCAPTION', 'DT', 'DD', 'SUMMARY', 'CAPTION']);
// A block nested in one of these is already covered by the outer block's text.
const CONTAINERS = new Set([...BLOCKS].filter((tag) => !['H3', 'H4', 'H5'].includes(tag)));
const SUB_TAGS = new Set(['H3', 'H4', 'SECTION', 'DIV']);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'SVG']);

const decode = (html) => JSDOM.fragment(`<span>${html}</span>`).textContent;
const norm = (s) => s.replace(/\s+/g, ' ').trim();

function rawText(el) {
  let out = '';
  for (const node of el.childNodes) {
    if (node.nodeType === 3) out += node.data;
    else if (node.nodeType === 1 && !SKIP_TAGS.has(node.tagName.toUpperCase())) {
      out += ` ${rawText(node)} `;
    }
  }
  return out;
}

function hasAncestor(el, test) {
  for (let a = el.parentElement; a; a = a.parentElement) if (test(a)) return true;
  return false;
}

const isMermaid = (el) => el.classList.contains('mermaid');

const docs = new Map();
const doc = (page) => {
  if (!docs.has(page)) {
    docs.set(page, new JSDOM(readFileSync(path.join(root, page), 'utf8')).window.document);
  }
  return docs.get(page);
};

const secs = [];
const heads = [];
const items = [];

for (const part of NAV) {
  for (const sec of part.secs) {
    const secIndex = secs.push([sec.page, sec.id, decode(sec.title)]) - 1;
    let section = doc(sec.page).getElementById(sec.id);
    if (!section) throw new Error(`missing section ${sec.page}#${sec.id}`);
    if (section.tagName !== 'SECTION') section = section.closest('section') ?? section;

    const subTitles = new Map(sec.subs.map((s) => [s.id, decode(s.title)]));
    let current = heads.push([secIndex, sec.id, decode(sec.title)]) - 1;

    for (const el of section.querySelectorAll('*')) {
      if (subTitles.has(el.id) && SUB_TAGS.has(el.tagName)) {
        current = heads.push([secIndex, el.id, subTitles.get(el.id)]) - 1;
      }
      if (
        BLOCKS.has(el.tagName) &&
        !hasAncestor(el, (a) => CONTAINERS.has(a.tagName)) &&
        !isMermaid(el) &&
        !hasAncestor(el, isMermaid)
      ) {
        const text = norm(rawText(el));
        if (text) items.push([current, text]);
      }
    }
  }
}

writeFileSync(path.join(root, 'search-index.json'), JSON.stringify({ v: 1, secs, heads, items }));
console.log(`search-index.json: ${secs.length} sections, ${heads.length} headings, ${items.length} entries`);
