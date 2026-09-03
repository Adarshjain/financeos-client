#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(__dirname);
const apiClientPath = path.join(projectRoot, 'src/lib/apiClient.ts');
const snapshotPath = path.join(__dirname, 'api-surface.snapshot.json');

function parseApiSurface(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract top-level exports
  const exportMatches = [...content.matchAll(/^export (?:const|class|function|type|interface) (\w+)/gm)];
  const exports = [];

  for (const match of exportMatches) {
    const name = match[1];
    if (name !== 'ApiError') {
      exports.push(name);
    }
  }

  // Handle aliases like `export const accountCardsApi = cardholdersApi;`
  const lines = content.split('\n');
  const aliasMap = {};
  const apiBlockStarts = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const aliasMatch = line.match(/^export const (\w+Api) = (\w+Api);/);
    if (aliasMatch) {
      aliasMap[aliasMatch[1]] = aliasMatch[2];
    }

    const blockMatch = line.match(/^export const (\w+Api) = \{/);
    if (blockMatch) {
      apiBlockStarts[blockMatch[1]] = i;
    }
  }

  // Extract methods for each API object
  const methods = {};

  for (const apiName of exports) {
    if (apiName.endsWith('Api')) {
      const targetName = aliasMap[apiName] || apiName;
      if (!apiBlockStarts[targetName]) {
        continue;
      }

      const startIdx = apiBlockStarts[targetName];
      const methodNames = [];

      for (let i = startIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === '};') {
          break;
        }
        // Match indented method definitions
        const methodMatch = line.match(/^ {2}(?:async\s+)?(\w+)\s*(?:[:(]|=)/);
        if (methodMatch) {
          methodNames.push(methodMatch[1]);
        }
      }

      methods[apiName] = methodNames.sort();
    }
  }

  return {
    exports: exports.sort(),
    methods,
  };
}

function compareApiSurface(current, snapshot) {
  const errors = [];
  const infos = [];

  // Check for missing exports
  for (const exportName of snapshot.exports) {
    if (!current.exports.includes(exportName)) {
      errors.push(`Missing export: ${exportName}`);
    }
  }

  // Check for extra exports
  for (const exportName of current.exports) {
    if (!snapshot.exports.includes(exportName)) {
      errors.push(`Unexpected export: ${exportName}`);
    }
  }

  // Check for missing/extra methods
  for (const apiName of snapshot.exports) {
    if (!snapshot.methods[apiName]) {
      continue;
    }

    const snapshotMethods = snapshot.methods[apiName] || [];
    const currentMethods = current.methods[apiName] || [];

    for (const method of snapshotMethods) {
      if (!currentMethods.includes(method)) {
        errors.push(`Missing method ${apiName}.${method}`);
      }
    }

    for (const method of currentMethods) {
      if (!snapshotMethods.includes(method)) {
        infos.push(`New method ${apiName}.${method}`);
      }
    }
  }

  return { errors, infos };
}

// Main logic
const writeMode = process.argv.includes('--write');

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
const current = parseApiSurface(apiClientPath);

if (writeMode) {
  fs.writeFileSync(snapshotPath, JSON.stringify(current, null, 2) + '\n');
  console.log('Snapshot updated');
  process.exit(0);
}

const { errors, infos } = compareApiSurface(current, snapshot);

if (infos.length > 0) {
  console.log('INFO: ' + infos.join('\nINFO: '));
}

if (errors.length > 0) {
  console.error('ERROR: ' + errors.join('\nERROR: '));
  process.exit(1);
}

console.log('API surface unchanged');
process.exit(0);
