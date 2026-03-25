import { useTranslation } from 'react-i18next';
import { resolveLocale } from './managerDebtorsModel';
import useManagerDebtorNotes from './useManagerDebtorNotes';
import useManagerDebtorsData from './useManagerDebtorsData';
import useManagerPaymentFlow from './useManagerPaymentFlow';

export default function useManagerDebtorsPage() {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);

  const dataState = useManagerDebtorsData({
    t,
    locale,
    language: i18n.language,
  });
  const notesState = useManagerDebtorNotes({ t });
  const paymentState = useManagerPaymentFlow({ t });

  return {
    ...dataState,
    ...notesState,
    ...paymentState,
    locale,
  };
}
