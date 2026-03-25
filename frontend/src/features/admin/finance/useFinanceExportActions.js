import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../../../lib/apiClient';
import { saveDownloadedFile } from '../../../lib/downloadUtils';
import { useExportFinanceDebtorsMutation } from '../../../services/api/exportApi';
import {
  buildFinanceDebtorsExportParams,
  resolveFinanceExportFormat,
} from './financeActionUtils';

export default function useFinanceExportActions({ t, financeQuery }) {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState('');
  const [exportFinanceDebtors] = useExportFinanceDebtorsMutation();

  const handleExportFinanceDebtors = useCallback(async (format) => {
    const safeFormat = resolveFinanceExportFormat(format);
    setExporting(safeFormat);
    try {
      const { blob, fileName } = await exportFinanceDebtors({
        format: safeFormat,
        params: buildFinanceDebtorsExportParams(financeQuery),
      }).unwrap();
      saveDownloadedFile({
        blob,
        fileName,
        fallbackName: `moliya-qarzdorlar.${safeFormat}`,
      });
      toast.success(t('{{format}} fayl yuklab olindi', { format: safeFormat.toUpperCase() }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting('');
    }
  }, [exportFinanceDebtors, financeQuery, t]);

  const handleOpenPayroll = useCallback(() => {
    navigate('/admin/oylik');
  }, [navigate]);

  return {
    exporting,
    handleExportFinanceDebtors,
    handleOpenPayroll,
  };
}
