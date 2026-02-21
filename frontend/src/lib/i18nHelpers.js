import React from 'react';

export function translateText(t, value) {
  if (typeof value !== 'string') return value;
  if (!value.trim()) return value;
  return t(value, { defaultValue: value });
}

export function translateNode(t, node) {
  if (typeof node === 'string') {
    return translateText(t, node);
  }

  if (Array.isArray(node)) {
    return node.map((item, index) => {
      if (typeof item === 'string') return translateText(t, item);
      if (React.isValidElement(item)) {
        const translatedProps = { ...item.props };
        const translatablePropKeys = ['placeholder', 'title', 'alt', 'aria-label', 'label'];
        translatablePropKeys.forEach((key) => {
          if (typeof translatedProps[key] === 'string') {
            translatedProps[key] = translateText(t, translatedProps[key]);
          }
        });

        return React.cloneElement(item, {
          ...translatedProps,
          key: item.key ?? index,
          children: translateNode(t, item.props?.children),
        });
      }
      return item;
    });
  }

  if (React.isValidElement(node)) {
    const translatedProps = { ...node.props };
    const translatablePropKeys = ['placeholder', 'title', 'alt', 'aria-label', 'label'];
    translatablePropKeys.forEach((key) => {
      if (typeof translatedProps[key] === 'string') {
        translatedProps[key] = translateText(t, translatedProps[key]);
      }
    });

    return React.cloneElement(node, {
      ...translatedProps,
      children: translateNode(t, node.props?.children),
    });
  }

  return node;
}
