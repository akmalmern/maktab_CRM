import { ConfirmModal } from '../../../components/ui';
import FinanceSection from '../shared/sections/FinanceSection';
import { buildAdminFinanceSectionViewModel } from './adminFinanceSectionModel';
import useAdminFinancePage from './useAdminFinancePage';

export default function AdminFinanceWorkspace() {
  const pageState = useAdminFinancePage();
  const sectionViewModel = buildAdminFinanceSectionViewModel(pageState);

  return (
    <div className="space-y-6">
      <FinanceSection viewModel={sectionViewModel} />

      <ConfirmModal
        {...pageState.confirmModalProps}
        loading={pageState.financeActionLoading}
      />
    </div>
  );
}
