function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n);
}

export default function SummaryCards({ income, expense, balance }) {
  return (
    <div className="summary-cards">
      <div className="card card-income">
        <div className="card-label">Income</div>
        <div className="card-value">{fmt(income)}</div>
      </div>
      <div className="card card-expense">
        <div className="card-label">Expenses</div>
        <div className="card-value">{fmt(expense)}</div>
      </div>
      <div className={`card card-balance ${balance >= 0 ? 'positive' : 'negative'}`}>
        <div className="card-label">Balance</div>
        <div className="card-value">
          {balance >= 0 ? '+' : ''}
          {fmt(balance)}
        </div>
      </div>
    </div>
  );
}
