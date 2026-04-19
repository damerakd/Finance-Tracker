function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n);
}

export default function EntryTable({ entries, onEdit, onDelete }) {
  if (entries.length === 0) {
    return (
      <div className="empty">
        <p>No entries yet — add your first one.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="entry-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th className="num">Amount</th>
            <th>Description</th>
            <th className="actions-col"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{e.date}</td>
              <td>
                <span className={`type-badge type-${e.type}`}>{e.type}</span>
              </td>
              <td>{e.category}</td>
              <td className={`num amount amount-${e.type}`}>
                {e.type === 'expense' ? '−' : '+'}
                {fmt(e.amount)}
              </td>
              <td className="desc">{e.description}</td>
              <td className="actions">
                <button type="button" onClick={() => onEdit(e)}>
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(e.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
