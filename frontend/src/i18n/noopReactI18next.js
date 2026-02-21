import React from 'react';

function interpolate(text, options = {}) {
  if (typeof text !== 'string') return text;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = options[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

const noopI18n = {
  language: 'uz',
  resolvedLanguage: 'uz',
  changeLanguage: () => Promise.resolve('uz'),
  exists: () => true,
  on: () => {},
  off: () => {},
};

export function useTranslation() {
  return {
    t: (key, options) => interpolate(key, options),
    i18n: noopI18n,
  };
}

export function Trans({ children }) {
  return React.createElement(React.Fragment, null, children);
}

export function withTranslation() {
  return (Component) => Component;
}

export const initReactI18next = {
  type: '3rdParty',
  init: () => {},
};

