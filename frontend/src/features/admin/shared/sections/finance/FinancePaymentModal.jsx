import { Badge, Button, Card, Modal, StateView } from '../../../../../components/ui';

export default function FinancePaymentModal({
  t,
  modalOpen,
  setModalOpen,
  selectedStudentId,
  detailState,
  detailStudent,
  detailImtiyozlar,
  paymentModalTab,
  setPaymentModalTab,
  actionLoading,
  onRollbackTarif,
  settingsMeta,
  onRevertPayment,
  PaymentFormCard,
  ImtiyozFormCard,
  FinanceLedgerTimelineCard,
  paymentForm,
  setPaymentForm,
  handleCreatePayment,
  isSelectedDetailReady,
  paymentPreview,
  serverPreviewLoading,
  serverPreviewError,
  imtiyozForm,
  setImtiyozForm,
  handleCreateImtiyoz,
  handleDeactivateImtiyoz,
  MonthChips,
  formatMonthKey,
  sumFormat,
}) {
  void PaymentFormCard;
  void ImtiyozFormCard;
  void FinanceLedgerTimelineCard;
  void MonthChips;
  return (
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("Student to'lovini belgilash")} maxWidth="max-w-3xl">
      {!selectedStudentId ? (
        <StateView type="empty" description={t('Student tanlanmagan')} />
      ) : (
        <div className="space-y-4">
          {detailState.loading ? (
            <StateView type="loading" />
          ) : detailState.error ? (
            <StateView type="error" description={detailState.error} />
          ) : (
            <>
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

              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-2 ring-1 ring-slate-200/50">
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant={paymentModalTab === 'payment' ? 'indigo' : 'secondary'} onClick={() => setPaymentModalTab('payment')}>
                    {t("To'lov")}
                  </Button>
                  <Button size="sm" variant={paymentModalTab === 'imtiyoz' ? 'indigo' : 'secondary'} onClick={() => setPaymentModalTab('imtiyoz')}>
                    {t('Imtiyoz')}
                    {!!detailImtiyozlar.length && ` (${detailImtiyozlar.length})`}
                  </Button>
                  <Button size="sm" variant={paymentModalTab === 'history' ? 'indigo' : 'secondary'} onClick={() => setPaymentModalTab('history')}>
                    {t('Tarix')}
                    {!!detailState.transactions?.length && ` (${detailState.transactions.length})`}
                  </Button>
                </div>
              </div>

              {paymentModalTab === 'payment' && (
                <PaymentFormCard
                  actionLoading={actionLoading}
                  detailState={detailState}
                  selectedStudentId={selectedStudentId}
                  isSelectedDetailReady={isSelectedDetailReady}
                  paymentForm={paymentForm}
                  setPaymentForm={setPaymentForm}
                  handleCreatePayment={handleCreatePayment}
                  setModalOpen={setModalOpen}
                  paymentPreview={paymentPreview}
                  serverPreviewLoading={serverPreviewLoading}
                  serverPreviewError={serverPreviewError}
                />
              )}

              {paymentModalTab === 'imtiyoz' && (
                <ImtiyozFormCard
                  actionLoading={actionLoading}
                  imtiyozForm={imtiyozForm}
                  setImtiyozForm={setImtiyozForm}
                  handleCreateImtiyoz={handleCreateImtiyoz}
                  detailImtiyozlar={detailImtiyozlar}
                  handleDeactivateImtiyoz={handleDeactivateImtiyoz}
                />
              )}

              {paymentModalTab === 'history' && !!settingsMeta?.tarifHistory?.length && (
                <Card title={t('Tarif versiyalari')}>
                  <div className="space-y-2">
                    {settingsMeta.tarifHistory.slice(0, 5).map((tarif) => {
                      const isRollbackDisabled = actionLoading || !onRollbackTarif || tarif.holat === 'AKTIV';
                      return (
                        <div
                          key={tarif.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {sumFormat(tarif.oylikSumma)} / {sumFormat(tarif.yillikSumma)} {t("so'm")}
                            </p>
                            <p className="text-xs text-slate-600">
                              {tarif.boshlanishSana ? new Date(tarif.boshlanishSana).toLocaleDateString('uz-UZ') : '-'} | {tarif.holat}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {tarif.holat === 'AKTIV' ? (
                              <Badge variant="success">{t('Aktiv')}</Badge>
                            ) : (
                              <Badge>{tarif.holat || '-'}</Badge>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={isRollbackDisabled}
                              onClick={() => onRollbackTarif?.(tarif.id)}
                            >
                              {t('Rollback')}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {paymentModalTab === 'history' && (
                <FinanceLedgerTimelineCard
                  detailState={detailState}
                  detailImtiyozlar={detailImtiyozlar}
                  actionLoading={actionLoading}
                  onRevertPayment={onRevertPayment}
                />
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
