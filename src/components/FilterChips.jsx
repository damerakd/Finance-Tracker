const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
  { value: 'transfer', label: 'Transfers' },
];

export default function FilterChips({ value, onChange }) {
  return (
    <div className="filter-chips">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`chip ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
