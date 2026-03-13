export function resolveRunPrimaryAction({
  selectedRun,
  isAdminView,
  isManagerView,
  canApproveSelectedRun,
  canPaySelectedRun,
  busy,
  labels,
  handlers,
}) {
  if (!selectedRun) return null;

  if ((isAdminView || isManagerView) && selectedRun.status === 'DRAFT') {
    return {
      label: labels.approve,
      onClick: handlers.onApprove,
      disabled: !canApproveSelectedRun || busy,
      variant: 'indigo',
    };
  }

  if (isAdminView && selectedRun.status === 'APPROVED') {
    return {
      label: labels.payAll,
      onClick: handlers.onPay,
      disabled: !canPaySelectedRun || busy,
      variant: 'success',
    };
  }

  if (selectedRun.status === 'PAID') {
    return {
      label: labels.downloadExcel,
      onClick: handlers.onExportExcel,
      disabled: busy,
      variant: 'secondary',
    };
  }

  return null;
}
