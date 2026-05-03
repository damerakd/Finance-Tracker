import { useState, useMemo } from 'react';

const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#10b981', '#6366f1', '#84cc16',
  '#a855f7', '#14b8a6', '#f43f5e', '#0ea5e9',
];

const SIZE = 220;
const RADIUS = 100;
const CX = SIZE / 2;
const CY = SIZE / 2;

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function arcPath(startAngle, endAngle) {
  const x1 = CX + RADIUS * Math.cos(startAngle);
  const y1 = CY + RADIUS * Math.sin(startAngle);
  const x2 = CX + RADIUS * Math.cos(endAngle);
  const y2 = CY + RADIUS * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${CX} ${CY} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export default function CategoryPieChart({ entries }) {
  const [type, setType] = useState('expense');
  const [hovered, setHovered] = useState(null);

  const slices = useMemo(() => {
    const m = new Map();
    for (const e of entries) {
      if (e.type !== type) continue;
      m.set(e.category, (m.get(e.category) || 0) + e.amount);
    }
    return [...m.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries, type]);

  const total = slices.reduce((s, x) => s + x.amount, 0);

  // Start at -π/2 (12 o'clock) and walk clockwise.
  let acc = -Math.PI / 2;
  const arcs = slices.map((s, i) => {
    const angle = total > 0 ? (s.amount / total) * Math.PI * 2 : 0;
    const path = arcPath(acc, acc + angle);
    const slice = {
      ...s,
      path,
      color: PALETTE[i % PALETTE.length],
      pct: total > 0 ? s.amount / total : 0,
    };
    acc += angle;
    return slice;
  });

  return (
    <section className="chart-section">
      <div className="chart-header">
        <h2>Category breakdown</h2>
        <div className="type-toggle chart-toggle">
          <button
            type="button"
            className={type === 'expense' ? 'active' : ''}
            onClick={() => setType('expense')}
          >
            Expenses
          </button>
          <button
            type="button"
            className={type === 'income' ? 'active' : ''}
            onClick={() => setType('income')}
          >
            Income
          </button>
        </div>
      </div>

      {total === 0 ? (
        <div className="empty">
          <p>No {type === 'expense' ? 'expenses' : 'income'} this month.</p>
        </div>
      ) : (
        <div className="chart-body">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className={`pie ${hovered ? 'has-hover' : ''}`}
            role="img"
            aria-label={`${type} breakdown by category`}
          >
            {arcs.length === 1 ? (
              <circle cx={CX} cy={CY} r={RADIUS} fill={arcs[0].color} />
            ) : (
              arcs.map((a) => (
                <path
                  key={a.category}
                  d={a.path}
                  fill={a.color}
                  stroke="#fff"
                  strokeWidth="2"
                  className={hovered === a.category ? 'hovered' : ''}
                  onMouseEnter={() => setHovered(a.category)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <title>{`${a.category}: ${fmt(a.amount)} (${(a.pct * 100).toFixed(1)}%)`}</title>
                </path>
              ))
            )}
          </svg>

          <ul className="chart-legend">
            {arcs.map((a) => (
              <li
                key={a.category}
                className={hovered === a.category ? 'hovered' : ''}
                onMouseEnter={() => setHovered(a.category)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className="swatch" style={{ background: a.color }} />
                <span className="cat-name">{a.category}</span>
                <span className="cat-amt">{fmt(a.amount)}</span>
                <span className="cat-pct">{(a.pct * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
