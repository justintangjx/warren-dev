#!/usr/bin/env node
/**
 * Ensures every lib/*.test.ts eval file is documented in AGENTS.md and README.md.
 * Run via: npm run check:docs
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const libDir = join(root, 'lib');
const agentsMd = readFileSync(join(root, 'AGENTS.md'), 'utf8');
const readmeMd = readFileSync(join(root, 'README.md'), 'utf8');

const evalTests = readdirSync(libDir)
  .filter((name) => name.endsWith('.test.ts'))
  .sort()
  .map((name) => `lib/${name}`);

const errors = [];

for (const testFile of evalTests) {
  const moduleFile = testFile.replace(/\.test\.ts$/, '.ts');

  if (!agentsMd.includes(testFile)) {
    errors.push(`${testFile} is missing from AGENTS.md (Evals Loop table).`);
  }
  if (!agentsMd.includes(moduleFile)) {
    errors.push(`${moduleFile} is missing from AGENTS.md (Evals Loop table).`);
  }
  if (!readmeMd.includes(testFile)) {
    errors.push(`${testFile} is missing from README.md (Testing section).`);
  }
}

if (errors.length > 0) {
  console.error('Documentation check failed:\n');
  for (const error of errors) {
    console.error(`  • ${error}`);
  }
  console.error('\nSee AGENTS.md → Documentation Maintenance Loop.');
  process.exit(1);
}

console.log(`check-docs: OK (${evalTests.length} eval test file(s) documented)`);
