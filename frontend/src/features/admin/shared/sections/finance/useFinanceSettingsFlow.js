import { useMemo, useState } from 'react';
import {
  buildAcademicYearOptions,
  buildFinanceCashflowPanel,
  buildFinanceSettingsValidation,
  buildFinanceStatusPanel,
  createDefaultSettingsDraft,
  getCurrentAcademicYearLabel,
  isValidAcademicYearLabel,
  normalizeBillingMonths,
  normalizeChargeableMonths,
  SCHOOL_MONTH_ORDER,
  sortSchoolMonths,
} from './financeSectionModel';

export default function useFinanceSettingsFlow({
  classrooms,
  settings,
  settingsMeta,
  studentsState,
  studentsSummary,
  onSaveSettings,
  t,
  locale,
}) {
  const [settingsDraft, setSettingsDraft] = useState(createDefaultSettingsDraft);

  const settingsValidation = useMemo(
    () =>
      buildFinanceSettingsValidation({
        settingsDraft,
        settings,
        settingsMeta,
        t,
        locale,
      }),
    [settingsDraft, settings, settingsMeta, t, locale],
  );

  const statusPanel = useMemo(
    () =>
      buildFinanceStatusPanel({
        studentsSummary,
        studentsState,
        settings,
        t,
        locale,
      }),
    [studentsSummary, studentsState, settings, t, locale],
  );

  const billingAcademicYearOptions = useMemo(
    () => buildAcademicYearOptions(classrooms, settingsValidation.computed.billingAcademicYear),
    [classrooms, settingsValidation.computed.billingAcademicYear],
  );

  const cashflowPanel = useMemo(
    () => buildFinanceCashflowPanel({ studentsSummary, locale }),
    [studentsSummary, locale],
  );

  async function handleSaveSettings(event) {
    event.preventDefault();
    if (!settingsValidation.valid) return;

    const oylik =
      settingsDraft.oylikSumma === ''
        ? Number(settings.oylikSumma || 0)
        : Number(settingsDraft.oylikSumma);
    const tolovOylarSoni = settingsValidation.computed.tolovOylarSoni;
    const yillik = settingsValidation.computed.yillik;

    const ok = await onSaveSettings({
      oylikSumma: oylik,
      yillikSumma: yillik,
      tolovOylarSoni,
      billingCalendar: {
        academicYear: settingsValidation.computed.billingAcademicYear,
        chargeableMonths: settingsValidation.computed.billingChargeableMonths,
      },
      boshlanishTuri: 'KELASI_OY',
      izoh: settingsDraft.izoh || undefined,
    });
    if (ok) {
      setSettingsDraft(createDefaultSettingsDraft());
    }
  }

  function handleResetDraft() {
    setSettingsDraft(createDefaultSettingsDraft());
  }

  function handleDefaultDraft() {
    const currentAcademicYear = isValidAcademicYearLabel(settings?.billingCalendar?.academicYear)
      ? settings.billingCalendar.academicYear
      : getCurrentAcademicYearLabel();
    setSettingsDraft({
      oylikSumma: '300000',
      billingAcademicYear: currentAcademicYear,
      billingChargeableMonths: SCHOOL_MONTH_ORDER.slice(0, 10),
      izoh: '',
    });
  }

  function toggleBillingMonth(month) {
    setSettingsDraft((prev) => {
      const currentBillingMonths = normalizeBillingMonths(settings?.tolovOylarSoni, 10);
      const currentMonths = Array.isArray(prev.billingChargeableMonths)
        ? prev.billingChargeableMonths
        : normalizeChargeableMonths(
            settings?.billingCalendar?.chargeableMonths,
            currentBillingMonths,
          );
      const nextMonths = currentMonths.includes(month)
        ? currentMonths.filter((m) => m !== month)
        : [...currentMonths, month];
      return {
        ...prev,
        billingChargeableMonths: sortSchoolMonths(nextMonths),
      };
    });
  }

  return {
    settingsDraft,
    setSettingsDraft,
    settingsValidation,
    statusPanel,
    billingAcademicYearOptions,
    cashflowPanel,
    handleSaveSettings,
    handleResetDraft,
    handleDefaultDraft,
    toggleBillingMonth,
  };
}
