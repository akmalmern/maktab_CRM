import { Badge, Button, Modal, StateView } from '../../../../components/ui';

function StatChip({ label, value, tone = 'default' }) {
  const tones = {
    default: 'border-slate-200 bg-white text-slate-700',
    info: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  };

  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone] || tones.default}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

export default function AnnualPromotionModal({
  t,
  open,
  previewState,
  actionLoading,
  onClose,
  onRefresh,
  onRequestRun,
}) {
  const annualPreview = previewState.preview;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Yillik sinf yangilash (Sentyabr)")}
      subtitle={t("Tarix saqlanadi: eski sinflar arxivlanadi, o'quvchilar yangi o'quv yilidagi sinflarga ko'chiriladi.")}
    >
      {previewState.loading ? <StateView type="loading" /> : null}
      {!previewState.loading && previewState.error ? (
        <StateView type="error" description={previewState.error} />
      ) : null}

      {!previewState.loading && !previewState.error && annualPreview ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 ring-1 ring-slate-200/50">
            <p className="text-sm font-medium text-slate-800">
              {t('{{from}} dan {{to}} ga', {
                from: annualPreview.sourceAcademicYear,
                to: annualPreview.targetAcademicYear,
              })}
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <StatChip
                label={t('Yangilanadigan sinflar')}
                value={annualPreview.promoteCount || 0}
                tone="info"
              />
              <StatChip
                label={t('Bitiruvchi sinflar')}
                value={annualPreview.graduateCount || 0}
                tone="warning"
              />
              <StatChip
                label={t("Yangilanadigan o'quvchilar")}
                value={annualPreview.studentsToPromote || 0}
                tone="success"
              />
              <StatChip
                label={t("Bitiruvchi o'quvchilar")}
                value={annualPreview.studentsToGraduate || 0}
              />
            </div>

            {!annualPreview.isSeptember ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-100">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="default"
                    className="border-amber-200 bg-amber-100 text-amber-800 shadow-none"
                  >
                    {t('Ogohlantirish')}
                  </Badge>
                  <span>{t("Hozir sentyabr emas. Bu manual ishga tushirish bo'ladi.")}</span>
                </div>
              </div>
            ) : null}
          </div>

          {annualPreview.conflictCount > 0 ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-700 ring-1 ring-rose-100">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="danger" className="shadow-none">
                  {t('Conflict')}: {annualPreview.conflictCount}
                </Badge>
                <span>
                  {t("Conflict mavjud: {{count}} ta. Avval mavjud sinflarni tekshiring.", {
                    count: annualPreview.conflictCount,
                  })}
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-slate-200/80 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button variant="secondary" onClick={onRefresh} disabled={previewState.loading}>
              {t("Preview yangilash")}
            </Button>
            <Button
              variant="success"
              onClick={onRequestRun}
              disabled={
                actionLoading ||
                previewState.loading ||
                annualPreview.conflictCount > 0 ||
                ((annualPreview.promoteCount || 0) === 0 &&
                  (annualPreview.graduateCount || 0) === 0)
              }
            >
              {t("Tasdiqlab avtomat o'tkazish")}
            </Button>
            <span className="text-xs text-slate-500">
              {t('Faqat preview tekshirilib tasdiqlangandan keyin ishga tushiring')}
            </span>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
