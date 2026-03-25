import { describe, expect, it } from 'vitest';
import {
  buildStudentGradesQuery,
  isStudentGradesFilterPristine,
} from './studentGradesModel';

describe('studentGradesModel', () => {
  it("buildStudentGradesQuery 'ALL' baho turini query'dan chiqaradi", () => {
    expect(
      buildStudentGradesQuery({
        sana: '',
        bahoTuri: 'ALL',
        page: 1,
        limit: 20,
      }),
    ).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it('isStudentGradesFilterPristine default filter holatini aniqlaydi', () => {
    expect(
      isStudentGradesFilterPristine({
        sana: '',
        bahoTuri: 'ALL',
        limit: 20,
      }),
    ).toBe(true);

    expect(
      isStudentGradesFilterPristine({
        sana: '2026-03-25',
        bahoTuri: 'ALL',
        limit: 20,
      }),
    ).toBe(false);
  });
});
