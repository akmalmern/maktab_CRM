import useFinancePaymentFlow from './useFinancePaymentFlow';
import useFinanceSettingsFlow from './useFinanceSettingsFlow';
import { useState } from 'react';

export default function useFinanceSectionController({
  classrooms,
  settings,
  settingsMeta,
  studentsState,
  studentsSummary,
  onSaveSettings,
  onCreatePayment,
  onCreateImtiyoz,
  onDeactivateImtiyoz,
  t,
  locale,
}) {
  const [activeTab, setActiveTab] = useState('payments');
  const settingsFlow = useFinanceSettingsFlow({
    classrooms,
    settings,
    settingsMeta,
    studentsState,
    studentsSummary,
    onSaveSettings,
    t,
    locale,
  });
  const paymentFlow = useFinancePaymentFlow({
    studentsState,
    studentsSummary,
    settings,
    onCreatePayment,
    onCreateImtiyoz,
    onDeactivateImtiyoz,
    t,
  });

  return {
    activeTab,
    setActiveTab,
    ...settingsFlow,
    ...paymentFlow,
  };
}
