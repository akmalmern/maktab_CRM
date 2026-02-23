import { useTranslation } from 'react-i18next';

const OPTIONS = [
  { value: 'uz', label: "O'zbekcha" },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();
  const value = i18n.language?.split('-')?.[0] || 'uz';

  return (
    <select
      value={value}
      onChange={(event) => i18n.changeLanguage(event.target.value)}
      className={`rounded-lg border border-slate-300 bg-white text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
        compact ? 'h-9 min-w-[120px] px-3 text-sm' : 'h-10 w-full px-3 text-sm'
      }`}
      aria-label="Language"
    >
      {OPTIONS.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
