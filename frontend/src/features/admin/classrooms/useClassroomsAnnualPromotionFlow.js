import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  usePreviewAnnualClassPromotionQuery,
  useRunAnnualClassPromotionMutation,
} from '../../../services/api/classroomsApi';

export default function useClassroomsAnnualPromotionFlow({ t }) {
  const [annualModalOpen, setAnnualModalOpen] = useState(false);
  const [runAnnualPromotion, runAnnualPromotionState] =
    useRunAnnualClassPromotionMutation();
  const annualPreviewQuery = usePreviewAnnualClassPromotionQuery(undefined, {
    skip: !annualModalOpen,
  });

  async function executeAnnualPromotion() {
    try {
      const payload = await runAnnualPromotion({ force: false }).unwrap();
      toast.success(payload?.message || t("Yillik sinf o'tkazish bajarildi"));
      setAnnualModalOpen(false);
      return true;
    } catch (error) {
      toast.error(error?.message || t("Yillik o'tkazish bajarilmadi"));
      return false;
    }
  }

  return {
    annualModalOpen,
    annualPreviewState: {
      preview: annualPreviewQuery.data?.plan || null,
      loading: annualPreviewQuery.isLoading || annualPreviewQuery.isFetching,
      error: annualPreviewQuery.error?.message || null,
    },
    annualActionLoading: runAnnualPromotionState.isLoading,
    onOpenAnnualModal: () => setAnnualModalOpen(true),
    onCloseAnnualModal: () => setAnnualModalOpen(false),
    onRefreshAnnualPreview: () => annualPreviewQuery.refetch(),
    executeAnnualPromotion,
  };
}
