import { useTranslation } from 'react-i18next';
import { AccountSettingsWorkspace } from '../../../features/account/settings';

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  return <AccountSettingsWorkspace scope="admin" roleLabel={t('roles.ADMIN')} />;
}
