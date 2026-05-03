import { useState } from 'react';

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ReviewModal({ extracted, categories, onSave, onClose }) {
  const [rows, setRows] = useState(() =>
    extracted.map((e) => ({ ...e, id: newId(), include: true }))
  );

  function update(id, patch) {
    setRows((r) =>
      r.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        if (patch.type && !categories[patch.type].includes(next.category)) {
          next.category = categories[patch.type][0] || 'Other';
        }
        return next;
      })
    );
  }

  function handleSave() {
    const toSave = rows
      .filter((r) => r.include)
      .map(({ include: _inc, ...e }) => ({
        id: e.id,
        type: e.type,
        date: e.date,
        category: e.category,
        amount: Number(e.amount) || 0,
        description: e.description || '',
      }))
      .filter((e) => e.amount > 0);
    onSave(toSave);
  }

  const selectedCount = rows.filter((r) => r.include).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>Review extracted entries</h2>
        <p className="hint">
          {rows.length === 0
            ? 'No entries extracted. Try a clearer image.'
            : `${selectedCount} of ${rows.length} entries will be saved. Edit any field inline, uncheck to skip.`}
        </p>

        {rows.length > 0 && (
          <div className="review-table-wrap">
            <table className="review-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th className="num">Amount</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.include ? '' : 'excluded'}>
                    <td>
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) => update(r.id, { include: e.target.checked })}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={r.date}
                        onChange={(e) => update(r.id, { date: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={r.type}
                        onChange={(e) => update(r.id, { type: e.target.value })}
                      >
                        <option value="income">income</option>
                        <option value="expense">expense</option>
                        <option value="transfer">transfer</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={r.category}
                        onChange={(e) => update(r.id, { category: e.target.value })}
                      >
                        {categories[r.type].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={r.amount}
                        onChange={(e) => update(r.id, { amount: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={r.description}
                        onChange={(e) => update(r.id, { description: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="primary"
            disabled={selectedCount === 0}
          >
            Save {selectedCount > 0 ? `${selectedCount} ` : ''}
            {selectedCount === 1 ? 'entry' : 'entries'}
          </button>
        </div>
      </div>
    </div>
  );
}
