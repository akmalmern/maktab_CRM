import { Badge } from '../../../../../components/ui';

export function statusBadge(holat, t) {
  if (holat === 'QARZDOR') {
    return <Badge variant="danger">{t('Qarzdor')}</Badge>;
  }
  return <Badge variant="success">{t("To'lagan")}</Badge>;
}
