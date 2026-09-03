import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RouteEntry {
  pattern: string;
  regex: RegExp;
}

function findPageFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPageFiles(fullPath));
    } else if (entry.isFile() && entry.name === 'page.tsx') {
      results.push(fullPath);
    }
  }

  return results;
}

export function loadRoutes(): RouteEntry[] {
  const appDir = path.resolve(__dirname, '../../src/app');
  const pageFiles = findPageFiles(appDir);
  const routes: RouteEntry[] = [];

  for (const filePath of pageFiles) {
    // Relative to appDir, e.g. "(protected)/loans/[id]/page.tsx" or "page.tsx"
    const rel = path.relative(appDir, filePath);

    // Split segments
    const rawSegments = rel.split(path.sep);
    // Remove the trailing page.tsx
    if (rawSegments[rawSegments.length - 1] === 'page.tsx') {
      rawSegments.pop();
    }

    // Filter out route groups: segments starting with '(' and ending with ')'
    const segments = rawSegments.filter((seg) => !/^\(.*\)$/.test(seg) && seg.length > 0);

    const pattern = segments.length === 0 ? '/' : `/${segments.join('/')}`;

    // Construct regex:
    // root -> ^\/$
    // segments: [param] -> [^/]+, catch-all [...param] -> .+, literal -> escape regex characters
    let regexStr: string;
    if (pattern === '/') {
      regexStr = '^\\/$';
    } else {
      const regexParts = segments.map((seg) => {
        if (/^\[\.\.\..+\]$/.test(seg)) {
          return '.+';
        }
        if (/^\[.+\]$/.test(seg)) {
          return '[^/]+';
        }
        return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      });
      regexStr = `^\\/${regexParts.join('\\/')}$`;
    }

    routes.push({
      pattern,
      regex: new RegExp(regexStr),
    });
  }

  // Sort routes:
  // Specific routes precede parameterized routes
  routes.sort((a, b) => {
    const aParams = (a.pattern.match(/\[/g) || []).length;
    const bParams = (b.pattern.match(/\[/g) || []).length;
    if (aParams !== bParams) {
      return aParams - bParams;
    }
    const aParts = a.pattern.split('/').length;
    const bParts = b.pattern.split('/').length;
    if (aParts !== bParts) {
      return bParts - aParts;
    }
    return a.pattern.localeCompare(b.pattern);
  });

  return routes;
}
