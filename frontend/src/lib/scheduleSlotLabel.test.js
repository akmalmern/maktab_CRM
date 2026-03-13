import { describe, expect, it } from 'vitest';
import { formatScheduleSlotLabel } from './scheduleSlotLabel';

describe('formatScheduleSlotLabel', () => {
  it('formats Uzbek lesson names as soat', () => {
    expect(formatScheduleSlotLabel('1-para', 'uz')).toBe('1-soat');
    expect(formatScheduleSlotLabel('2 para', 'uz-UZ')).toBe('2-soat');
  });

  it('formats Russian lesson names', () => {
    expect(formatScheduleSlotLabel('3-para', 'ru')).toBe('3-\u0443\u0440\u043e\u043a');
    expect(formatScheduleSlotLabel('4 \u0443\u0440\u043e\u043a', 'ru-RU')).toBe('4-\u0443\u0440\u043e\u043a');
  });

  it('formats English lesson names as period', () => {
    expect(formatScheduleSlotLabel('5-para', 'en')).toBe('Period 5');
    expect(formatScheduleSlotLabel('6 lesson', 'en-US')).toBe('Period 6');
  });

  it('keeps non-period labels unchanged', () => {
    expect(formatScheduleSlotLabel('Tanaffus', 'uz')).toBe('Tanaffus');
  });
});
