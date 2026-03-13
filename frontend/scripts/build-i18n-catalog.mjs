import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { adminLocaleOverrides } from '../src/i18n/adminOverrides.js';
import { buildStaticLocaleCatalog } from '../src/i18n/localeQuality.js';
import { payrollFinanceGlossaryOverrides } from '../src/i18n/payrollFinanceGlossary.js';
import { payrollFinanceLocaleOverrides } from '../src/i18n/payrollFinanceOverrides.js';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ru from '../src/i18n/locales/ru.json' with { type: 'json' };
import uz from '../src/i18n/locales/uz.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const targetPath = path.join(frontendRoot, 'src', 'i18n', 'locales', 'catalog.json');

const catalog = buildStaticLocaleCatalog({
  uz,
  en,
  ru,
  adminOverrides: adminLocaleOverrides,
  payrollFinanceOverrides: payrollFinanceLocaleOverrides,
  glossaryOverrides: payrollFinanceGlossaryOverrides,
});

fs.writeFileSync(targetPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`[i18n-build] wrote ${targetPath}`);
