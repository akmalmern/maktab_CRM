import { useTranslation } from 'react-i18next';
import { translateNode } from '../lib/i18nHelpers';

export default function AutoTranslate({ children }) {
  const { t } = useTranslation();
  return <>{translateNode(t, children)}</>;
}

