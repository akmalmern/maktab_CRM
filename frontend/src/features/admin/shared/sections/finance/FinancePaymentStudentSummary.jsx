export default function FinancePaymentStudentSummary({
  t,
  detailStudent,
  MonthChips,
  formatMonthKey,
}) {
  void MonthChips;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 text-sm ring-1 ring-slate-200/50">
      <p className="font-semibold text-slate-900">{detailStudent?.fullName || '-'}</p>
      <p className="mt-1 text-slate-600">
        {t('Qarzdor oylar')}: {detailStudent?.qarzOylarSoni || 0} {t('ta')}
      </p>
      <div className="mt-2">
        <MonthChips
          months={
            detailStudent?.qarzOylarFormatted?.length
              ? detailStudent.qarzOylarFormatted
              : (detailStudent?.qarzOylar || []).map(formatMonthKey)
          }
          maxVisible={5}
        />
      </div>
    </div>
  );
}
