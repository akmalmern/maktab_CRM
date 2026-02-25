import { Button, Card, Input, Select, Textarea } from '../../../../../components/ui';

export default function FinanceSettingsPanel({
  t,
  settings,
  settingsMeta,
  settingsDraft,
  setSettingsDraft,
  settingsValidation,
  actionLoading,
  handleSaveSettings,
  handleResetDraft,
  handleDefaultDraft,
  toggleBillingMonth,
  billingAcademicYearOptions,
  locale,
  sumFormat,
  normalizeBillingMonths,
  isValidAcademicYearLabel,
  monthNameByNumber,
  SCHOOL_MONTH_ORDER,
  BILLING_MONTH_OPTIONS,
  FieldLabel,
  MiniStatCard,
}) {
  void FieldLabel;
  void MiniStatCard;
  return (
    <Card
      title={t('Tarif sozlamalari')}
      subtitle={t("Oylik summa kiriting, yillik summa avtomatik hisoblanadi (to'lov oylar soni asosida).")}
    >
      <form
        onSubmit={handleSaveSettings}
        className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 ring-1 ring-slate-200/50"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <FieldLabel>{t('Oylik summa')}</FieldLabel>
            <Input
              type="number"
              min={0}
              value={settingsDraft.oylikSumma || settings.oylikSumma || ''}
              onChange={(e) => setSettingsDraft((p) => ({ ...p, oylikSumma: e.target.value }))}
              placeholder={t('Oylik summa')}
            />
            {settingsValidation.errors.oylikSumma && (
              <p className="mt-1 text-xs text-rose-600">{settingsValidation.errors.oylikSumma}</p>
            )}
          </div>
          <div>
            <FieldLabel>{t("To'lov olinadigan oylar soni")}</FieldLabel>
            <Input type="text" readOnly value={`${settingsValidation.computed.tolovOylarSoni} ${t('oy')}`} />
            <p className="mt-1 text-xs text-slate-500">
              {t("Oylar pastdagi billing calendar'dan tanlanadi. Tanlanmagan oylar ta'til deb olinadi.")}
            </p>
            {settingsValidation.errors.tolovOylarSoni && (
              <p className="mt-1 text-xs text-rose-600">{settingsValidation.errors.tolovOylarSoni}</p>
            )}
          </div>
          <div>
            <FieldLabel>{t('Yillik summa (avtomatik)')}</FieldLabel>
            <Input
              type="text"
              readOnly
              value={settingsValidation.computed.yillik ? sumFormat(settingsValidation.computed.yillik) : ''}
              placeholder={t('Yillik summa avtomatik chiqadi')}
            />
            <p className="mt-1 text-xs text-slate-500">
              {t('Formula')}: {t('Oylik summa').toLowerCase()} Г— {settingsValidation.computed.tolovOylarSoni} {t('oy')}
            </p>
            {settingsValidation.errors.yillikSumma && (
              <p className="mt-1 text-xs text-rose-600">{settingsValidation.errors.yillikSumma}</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <FieldLabel>{t("Billing calendar (to'lov olinadigan oylar)")}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {(settingsMeta?.constraints?.billingMonthsOptions || BILLING_MONTH_OPTIONS).map((months) => (
                <button
                  key={months}
                  type="button"
                  onClick={() =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      billingChargeableMonths: SCHOOL_MONTH_ORDER.slice(0, months),
                    }))
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                >
                  {months} {t('oy')} {t('preset')}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <FieldLabel>{t("Billing calendar o'quv yili")}</FieldLabel>
              <Select
                value={
                  isValidAcademicYearLabel(settingsDraft.billingAcademicYear)
                    ? settingsDraft.billingAcademicYear
                    : settingsValidation.computed.billingAcademicYear
                }
                onChange={(e) =>
                  setSettingsDraft((prev) => ({
                    ...prev,
                    billingAcademicYear: e.target.value,
                  }))
                }
              >
                {billingAcademicYearOptions.map((academicYear) => (
                  <option key={academicYear} value={academicYear}>
                    {academicYear}
                  </option>
                ))}
              </Select>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              {t("Ushbu calendar faqat tanlangan o'quv yilidagi qaysi oylar to'lovli / ta'til ekanini belgilaydi.")}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {SCHOOL_MONTH_ORDER.map((monthNo) => {
              const selected = settingsValidation.computed.billingChargeableMonths.includes(monthNo);
              return (
                <button
                  key={monthNo}
                  type="button"
                  onClick={() => toggleBillingMonth(monthNo)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    selected
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium">{monthNameByNumber(monthNo, locale)}</div>
                  <div className="mt-1 text-xs text-slate-500">{selected ? t("To'lov olinadi") : t("Ta'til")}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {t("To'lov olinadigan oylar")}:{' '}
              {settingsValidation.computed.billingChargeableMonths.map((m) => monthNameByNumber(m, locale)).join(', ') ||
                '-'}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              {t("Ta'til oylar")}:{' '}
              {settingsValidation.computed.vacationMonths.map((m) => monthNameByNumber(m, locale)).join(', ') || '-'}
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>{t('Ichki izoh (ixtiyoriy)')}</FieldLabel>
          <Textarea
            rows={2}
            value={settingsDraft.izoh}
            onChange={(e) => setSettingsDraft((p) => ({ ...p, izoh: e.target.value }))}
            placeholder={t('Masalan: Kelasi oy uchun yangi tarif')}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-2">
          <Button
            type="submit"
            variant="indigo"
            disabled={actionLoading || !settingsValidation.changed || !settingsValidation.valid}
          >
            {actionLoading ? t('Saqlanmoqda...') : t('Saqlash')}
          </Button>
          <Button type="button" variant="secondary" onClick={handleResetDraft} disabled={actionLoading}>
            {t('Bekor qilish')}
          </Button>
          <Button type="button" variant="secondary" onClick={handleDefaultDraft} disabled={actionLoading}>
            {t('Default')}
          </Button>
          <span className="text-xs text-slate-500">
            {settingsValidation.changed ? t("O'zgartirishlar tayyor") : t("O'zgartirish yo'q")}
          </span>
        </div>
      </form>

      <div className="mt-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200/40">
        {t('Joriy tarif')}: {t('Oylik summa').toLowerCase()} {sumFormat(settings.oylikSumma)} {t("so'm")},{' '}
        {t('Yillik summa (avtomatik)').toLowerCase()} {sumFormat(settings.yillikSumma)} {t("so'm")} (
        {normalizeBillingMonths(settings?.tolovOylarSoni, 10)} {t('oy')})
        {isValidAcademicYearLabel(settings?.billingCalendar?.academicYear)
          ? `, ${t('billing calendar')}: ${settings.billingCalendar.academicYear}`
          : ''}
        .
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
        <MiniStatCard label={t('Studentlar soni')} value={Number(settingsMeta?.preview?.studentCount || 0)} tone="info" />
        <MiniStatCard
          label={t('Oylik taxminiy tushum')}
          value={`${sumFormat(settingsMeta?.preview?.expectedMonthly || 0)} ${t("so'm")}`}
        />
        <MiniStatCard
          label={t('Yillik taxminiy tushum')}
          value={`${sumFormat(settingsMeta?.preview?.expectedYearly || 0)} ${t("so'm")}`}
        />
        <MiniStatCard
          label={t("Shu oy tushgan to'lovlar")}
          value={`${sumFormat(settingsMeta?.preview?.thisMonthPaidAmount || 0, locale)} ${t("so'm")}`}
          tone="success"
        />
        <MiniStatCard
          label={t('Umumiy qarzdorlik summasi')}
          value={`${sumFormat(settingsMeta?.preview?.gapYearly || 0, locale)} ${t("so'm")}`}
          tone="danger"
        />
      </div>
    </Card>
  );
}
