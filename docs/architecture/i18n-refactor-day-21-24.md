# I18n Refactor Day 21-24

## Scope

- Replace runtime locale merging with a static source-of-truth catalog.
- Reduce runtime auto-fix behavior to zero.
- Tighten CI around locale parity and glossary consistency.
- Align Payroll / Finance / Dashboard terminology with a shared glossary.

## Source of truth

- Runtime now reads translations only from `frontend/src/i18n/locales/catalog.json`.
- Legacy files remain only as migration inputs for `frontend/scripts/build-i18n-catalog.mjs`:
  - `locales/uz.json`
  - `locales/en.json`
  - `locales/ru.json`
  - `adminOverrides.js`
  - `payrollFinanceOverrides.js`
  - `payrollFinanceGlossary.js`

## Runtime changes

- `frontend/src/i18n/index.js` no longer merges or normalizes locales at runtime.
- Locale normalization is now a build-time concern only.

## Audit changes

- `frontend/scripts/i18n-audit.mjs` now validates:
  - locale parity
  - placeholder parity
  - mojibake detection
  - glossary enforcement
  - suspicious untranslated text warnings

## CI

- GitHub Actions frontend job keeps `npm run i18n:check` as a hard gate.
- Step name is now explicit: `I18n quality gate`.

## Outcome

- Static catalog generated: `frontend/src/i18n/locales/catalog.json`
- Runtime auto-fix removed from app bootstrap
- Glossary expanded for Payroll / Finance / Dashboard high-visibility strings
- Audit result: `warnings=0`

## Validation

- `npm run i18n:build`
- `npm run i18n:check`
- `npm run lint`
- `npm test`
- `npm run build`

## Next step

- Move remaining non-domain admin strings from legacy locale fragments into the static catalog directly and retire legacy merge inputs completely.
