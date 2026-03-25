import { describe, expect, it } from 'vitest';
import {
  buildPersonBackLink,
  buildPersonFullName,
  formatBytes,
} from './adminPersonDetailModel';

describe('adminPersonDetailModel', () => {
  it('buildPersonFullName person bo`lmasa fallback qaytaradi', () => {
    expect(buildPersonFullName(null)).toBe('-');
    expect(buildPersonFullName({ firstName: 'Ali', lastName: 'Valiyev' })).toBe('Ali Valiyev');
  });

  it('buildPersonBackLink turga qarab admin ro`yxatga qaytaradi', () => {
    expect(buildPersonBackLink('teacher')).toBe('/admin/teachers');
    expect(buildPersonBackLink('student')).toBe('/admin/students');
  });

  it('formatBytes fayl hajmini o`qilishi oson formatga o`giradi', () => {
    expect(formatBytes(0)).toBe('-');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });
});
