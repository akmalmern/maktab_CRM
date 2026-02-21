const { i18n, DEFAULT_LANG, resolveRequestLang, tError } = require("../i18n");

function locale(req, res, next) {
  i18n.init(req, res);
  const lang = resolveRequestLang(req) || DEFAULT_LANG;
  req.setLocale(lang);
  req.lang = lang;
  req.t = (key, ...params) => req.__(key, ...params);
  req.tError = (code, fallbackMessage = "", params = {}) =>
    tError({ code, req, locale: lang, fallbackMessage, params });
  res.setHeader("Content-Language", lang);
  next();
}

module.exports = { locale };
