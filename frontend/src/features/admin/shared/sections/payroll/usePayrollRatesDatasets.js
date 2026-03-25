import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../../../../lib/apiClient';
import {
  buildRatesDatasetQuery,
  createRatesDataset,
  mergeRatesDatasetPage,
  RATES_PAGE_LIMIT,
} from './payrollSectionModel';

export function usePayrollRatesDatasets({
  shouldLoad,
  reloadKey,
  loadPayrollTeacherRates,
  loadPayrollSubjectRates,
}) {
  const [teacherRatesDataset, setTeacherRatesDataset] = useState(createRatesDataset);
  const [subjectRatesDataset, setSubjectRatesDataset] = useState(createRatesDataset);

  const loadTeacherRatesPage = useCallback(async (targetPage) => {
    setTeacherRatesDataset((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));
    try {
      const response = await loadPayrollTeacherRates(
        { page: targetPage, limit: RATES_PAGE_LIMIT },
        true,
      ).unwrap();
      setTeacherRatesDataset((prev) => mergeRatesDatasetPage(prev, response, targetPage));
    } catch (error) {
      setTeacherRatesDataset((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error),
        partial: true,
      }));
    }
  }, [loadPayrollTeacherRates]);

  const loadSubjectRatesPage = useCallback(async (targetPage) => {
    setSubjectRatesDataset((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));
    try {
      const response = await loadPayrollSubjectRates(
        { page: targetPage, limit: RATES_PAGE_LIMIT },
        true,
      ).unwrap();
      setSubjectRatesDataset((prev) => mergeRatesDatasetPage(prev, response, targetPage));
    } catch (error) {
      setSubjectRatesDataset((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error),
        partial: true,
      }));
    }
  }, [loadPayrollSubjectRates]);

  const loadMoreTeacherRates = useCallback(() => {
    if (teacherRatesDataset.loading) return;
    if (!teacherRatesDataset.pages || teacherRatesDataset.page >= teacherRatesDataset.pages) return;
    loadTeacherRatesPage(teacherRatesDataset.page + 1);
  }, [loadTeacherRatesPage, teacherRatesDataset.loading, teacherRatesDataset.page, teacherRatesDataset.pages]);

  const loadMoreSubjectRates = useCallback(() => {
    if (subjectRatesDataset.loading) return;
    if (!subjectRatesDataset.pages || subjectRatesDataset.page >= subjectRatesDataset.pages) return;
    loadSubjectRatesPage(subjectRatesDataset.page + 1);
  }, [loadSubjectRatesPage, subjectRatesDataset.loading, subjectRatesDataset.page, subjectRatesDataset.pages]);

  useEffect(() => {
    if (!shouldLoad) return;
    loadTeacherRatesPage(1);
    loadSubjectRatesPage(1);
  }, [shouldLoad, reloadKey, loadTeacherRatesPage, loadSubjectRatesPage]);

  return {
    teacherRatesDataset,
    subjectRatesDataset,
    payrollTeacherRatesQuery: buildRatesDatasetQuery(teacherRatesDataset),
    payrollSubjectRatesQuery: buildRatesDatasetQuery(subjectRatesDataset),
    loadMoreTeacherRates,
    loadMoreSubjectRates,
  };
}
