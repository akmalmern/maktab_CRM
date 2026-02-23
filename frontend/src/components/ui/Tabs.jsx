import Button from './Button';

export default function Tabs({ items = [], value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 ring-1 ring-slate-200/50">
      {items.map((item) => (
        <Button
          key={item.value}
          size="sm"
          variant={value === item.value ? 'indigo' : 'secondary'}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
