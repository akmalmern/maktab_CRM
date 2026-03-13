import { describe, expect, it } from 'vitest';

import {
  buildStaticLocaleCatalog,
  collectGlossaryIssues,
  collectLocaleParityIssues,
  collectMojibakeIssues,
  tryDecodeCp1251Mojibake,
} from './localeQuality';

describe('localeQuality', () => {
  it('decodes cp1251 mojibake strings', () => {
    expect(tryDecodeCp1251Mojibake('РџР°РЅРµР»СЊ')).toBe('Панель');
    expect(tryDecodeCp1251Mojibake('Panel')).toBe('Panel');
  });

  it('builds a static catalog with glossary overrides', () => {
    const catalog = buildStaticLocaleCatalog({
      uz: { Salom: 'Salom' },
      en: { Salom: 'Salom' },
      ru: { Salom: 'РЎР°Р»РѕРј' },
      glossaryOverrides: {
        uz: {},
        en: { Salom: 'Hello' },
        ru: { Salom: 'Привет' },
      },
    });

    expect(catalog.en.Salom).toBe('Hello');
    expect(catalog.ru.Salom).toBe('Привет');
  });

  it('reports parity, glossary and mojibake issues separately', () => {
    const catalog = {
      uz: { A: 'A', B: 'B' },
      en: { A: 'A' },
      ru: { A: 'РџР°РЅРµР»СЊ', B: 'B' },
    };
    const glossary = {
      uz: {},
      en: { A: 'Alpha' },
      ru: {},
    };

    expect(collectLocaleParityIssues(catalog)).toContain('EN missing key: B');
    expect(collectGlossaryIssues(catalog, glossary)).toContain(
      'EN glossary mismatch for "A": expected "Alpha", got "A"',
    );
    expect(collectMojibakeIssues(catalog)).toContain('RU mojibake at A');
  });
});
