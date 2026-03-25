import { describe, expect, it } from 'vitest';
import {
  isScheduleConflictMessage,
  parseScheduleError,
} from './scheduleSectionModel';

describe('scheduleSectionModel', () => {
  it('reads message from API error payload', () => {
    const message = parseScheduleError(
      { data: { message: "Dars vaqti band" } },
      'fallback',
    );
    expect(message).toBe("Dars vaqti band");
  });

  it('falls back when error has no message', () => {
    expect(parseScheduleError({}, 'fallback')).toBe('fallback');
  });

  it('detects schedule conflict keywords', () => {
    expect(isScheduleConflictMessage("Bu vaqtda dars band")).toBe(true);
    expect(isScheduleConflictMessage('Server xatosi')).toBe(false);
  });
});
