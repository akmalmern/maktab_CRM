import Button from './Button';

export default function Tabs({ items = [], value, onChange }) {
  return (
    <div className="flex gap-2">
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
