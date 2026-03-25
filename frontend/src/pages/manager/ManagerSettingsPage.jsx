import { useTranslation } from 'react-i18next';
import { AccountSettingsWorkspace } from '../../features/account/settings';

export default function ManagerSettingsPage() {
  const { t } = useTranslation();
  return <AccountSettingsWorkspace scope="manager" roleLabel={t('roles.MANAGER')} />;
}
