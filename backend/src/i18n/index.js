const i18n = require("i18n");
const { CATALOG } = require("./messages");

const SUPPORTED_LANGS = ["uz", "ru", "en"];
const DEFAULT_LANG = "uz";

i18n.configure({
  locales: SUPPORTED_LANGS,
  defaultLocale: DEFAULT_LANG,
  staticCatalog: CATALOG,
  objectNotation: true,
  register: global,
  updateFiles: false,
  syncFiles: false,
  autoReload: false,
  retryInDefaultLocale: true,
});

function normalizeLang(rawValue) {
  if (!rawValue || typeof rawValue !== "string") return null;
  const base = rawValue
    .split(",")[0]
    .trim()
    .toLowerCase()
    .split("-")[0];
  return SUPPORTED_LANGS.includes(base) ? base : null;
}

function resolveRequestLang(req) {
  const queryLang = normalizeLang(req?.query?.lang);
  if (queryLang) return queryLang;

  const headerLang = normalizeLang(req?.headers?.["x-lang"]);
  if (headerLang) return headerLang;

  const acceptLanguage = normalizeLang(req?.headers?.["accept-language"]);
  if (acceptLanguage) return acceptLanguage;

  return DEFAULT_LANG;
}

function getI18nByLocale(locale, phrase, params) {
  const translated = i18n.__({ phrase, locale }, params || {});
  return translated && translated !== phrase ? translated : "";
}

function tError({ code, req, locale, fallbackMessage = "", params }) {
  const phrase = `errors.${code}`;
  const safeLocale =
    normalizeLang(locale || req?.lang || req?.getLocale?.()) || DEFAULT_LANG;

  if (req && typeof req.__ === "function") {
    const translated = req.__(phrase, params || {});
    if (translated && translated !== phrase) return translated;
  }

  const translatedByLocale = getI18nByLocale(safeLocale, phrase, params);
  if (translatedByLocale) return translatedByLocale;

  const translatedByDefault = getI18nByLocale(DEFAULT_LANG, phrase, params);
  if (translatedByDefault) return translatedByDefault;

  if (fallbackMessage) return fallbackMessage;
  return getI18nByLocale(safeLocale, "errors.INTERNAL_ERROR");
}

module.exports = {
  i18n,
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  normalizeLang,
  resolveRequestLang,
  tError,
};
