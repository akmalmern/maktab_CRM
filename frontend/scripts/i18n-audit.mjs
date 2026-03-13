import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  collectGlossaryIssues,
  collectLocaleParityIssues,
  collectMojibakeIssues,
  collectPlaceholderIssues,
  collectSuspiciousLocaleWarnings,
  flattenLeaves,
} from '../src/i18n/localeQuality.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

function readJson(relativePath) {
  const filePath = path.join(frontendRoot, relativePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadModule(relativePath, exportName) {
  const moduleUrl = pathToFileURL(path.join(frontendRoot, relativePath)).href;
  return import(moduleUrl).then((mod) => mod[exportName]);
}

function printIssues(issues) {
  issues.forEach((issue) => {
    console.error(`- ${issue}`);
  });
}

async function main() {
  const catalog = readJson('src/i18n/locales/catalog.json');
  const glossary = await loadModule('src/i18n/payrollFinanceGlossary.js', 'payrollFinanceGlossaryOverrides');

  const errors = [
    ...collectLocaleParityIssues(catalog),
    ...collectPlaceholderIssues(catalog),
    ...collectMojibakeIssues(catalog),
    ...collectGlossaryIssues(catalog, glossary),
  ];
  const warnings = collectSuspiciousLocaleWarnings(catalog);
  const keyCount = flattenLeaves(catalog.uz || {}).size;
  const glossaryCount = new Set([
    ...Object.keys(glossary.uz || {}),
    ...Object.keys(glossary.en || {}),
    ...Object.keys(glossary.ru || {}),
  ]).size;

  if (warnings.length) {
    console.warn('[i18n-audit] warnings:');
    warnings.forEach((warning) => console.warn(`- ${warning}`));
  }

  if (errors.length) {
    console.error(`[i18n-audit] failed with ${errors.length} issue(s):`);
    printIssues(errors);
    process.exit(1);
  }

  console.log(`[i18n-audit] ok. keys=${keyCount}, glossary=${glossaryCount}, warnings=${warnings.length}`);
}

main().catch((error) => {
  console.error('[i18n-audit] unexpected error:', error);
  process.exit(1);
});
