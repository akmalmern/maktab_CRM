export const DOC_KINDS = ['PASSPORT', 'CONTRACT', 'CERTIFICATE', 'DIPLOMA', 'MEDICAL', 'OTHER'];

export function formatDate(value, language = 'uz') {
  if (!value) return '-';
  const localeByLanguage = {
    uz: 'uz-UZ',
    ru: 'ru-RU',
    en: 'en-US',
  };
  return new Date(value).toLocaleDateString(localeByLanguage[language] || 'uz-UZ');
}

export function formatDateTime(value, language = 'uz') {
  if (!value) return '-';
  const localeByLanguage = {
    uz: 'uz-UZ',
    ru: 'ru-RU',
    en: 'en-US',
  };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(localeByLanguage[language] || 'uz-UZ');
}

export function formatBytes(bytes) {
  if (!bytes) return '-';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < sizes.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(1)} ${sizes[i]}`;
}

export function resolveAssetUrl(filePath) {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const base = import.meta.env.VITE_API_URL || window.location.origin;
  return `${base}${filePath}`;
}

export function buildPersonFullName(person) {
  if (!person) return '-';
  return `${person.firstName || ''} ${person.lastName || ''}`.trim() || '-';
}

export function buildPersonBackLink(type) {
  return type === 'teacher' ? '/admin/teachers' : '/admin/students';
}
