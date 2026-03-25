import { useTranslation } from 'react-i18next';
import { AccountSettingsWorkspace } from '../../features/account/settings';

export default function StudentSettingsPage() {
  const { t } = useTranslation();
  return <AccountSettingsWorkspace scope="student" roleLabel={t('roles.STUDENT')} />;
}
