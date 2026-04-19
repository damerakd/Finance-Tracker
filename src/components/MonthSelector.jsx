export default function MonthSelector({ value, onChange }) {
  return (
    <input
      type="month"
      className="month-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
