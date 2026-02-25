import { useTranslation } from 'react-i18next';
import Badge from './Badge';

const STATUS_MAP = {
  financeStudent: {
    QARZDOR: { variant: 'danger', label: "Qarzdor" },
    TOLANGAN: { variant: 'success', label: "To'lagan" },
    QISMAN_TOLANGAN: { variant: 'default', label: "Qisman to'langan" },
  },  financeDebt: {
    QARZDOR: { variant: 'danger', label: "Qarzdor" },
    TOLANGAN: { variant: 'success', label: "To'lagan" },
    QISMAN_TOLANGAN: { variant: 'default', label: "Qisman to'langan" },
  },
  financeTransaction: {
    AKTIV: { variant: 'success', label: 'Aktiv' },
    BEKOR_QILINGAN: { variant: 'default', label: 'Bekor qilingan', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  },
  attendance: {
    KELDI: { variant: 'success', label: 'Keldi' },
    KECHIKDI: { variant: 'default', label: 'Kechikdi', className: 'border-amber-200 bg-amber-50 text-amber-700' },
    SABABLI: { variant: 'info', label: 'Sababli' },
    SABABSIZ: { variant: 'danger', label: 'Sababsiz' },
  },
  gradeType: {
    JORIY: { variant: 'info', label: 'Joriy' },
    NAZORAT: { variant: 'default', label: 'Nazorat' },
    ORALIQ: { variant: 'default', label: 'Oraliq' },
    YAKUNIY: { variant: 'success', label: 'Yakuniy' },
    ALL: { variant: 'default', label: 'Hammasi' },
  },
};

export default function StatusBadge({
  domain,
  value,
  count,
  withCount = false,
  countTemplate,
  className = '',
  fallbackVariant = 'default',
  fallbackLabel,
}) {
  const { t } = useTranslation();
  const normalizedValue = String(value || '').trim().toUpperCase();
  const entry = STATUS_MAP[domain]?.[normalizedValue];

  const labelBase = entry?.label || fallbackLabel || value || '-';
  const label = countTemplate && count !== undefined
    ? t(countTemplate, { count, defaultValue: countTemplate })
    : withCount && count !== undefined
      ? `${t(labelBase, { defaultValue: labelBase })} (${count})`
      : t(labelBase, { defaultValue: labelBase });

  return (
    <Badge
      variant={entry?.variant || fallbackVariant}
      className={`${entry?.className || ''} ${className}`.trim()}
    >
      {label}
    </Badge>
  );
}

