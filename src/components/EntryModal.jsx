import { useState } from 'react';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function EntryModal({ entry, categories, onSave, onClose }) {
  const initialType = entry?.type || 'expense';
  const [type, setType] = useState(initialType);
  const [date, setDate] = useState(entry?.date || todayISO());
  const [category, setCategory] = useState(
    entry?.category || categories[initialType][0] || ''
  );
  const [amount, setAmount] = useState(entry?.amount?.toString() || '');
  const [description, setDescription] = useState(entry?.description || '');
  const [error, setError] = useState('');

  function handleTypeChange(newType) {
    setType(newType);
    if (!categories[newType].includes(category)) {
      setCategory(categories[newType][0] || '');
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!date) return setError('Date is required');
    if (!category) return setError('Category is required');
    if (!amt || amt <= 0) return setError('Amount must be greater than 0');

    onSave({
      id: entry?.id || newId(),
      type,
      date,
      category,
      amount: Math.round(amt * 100) / 100,
      description: description.trim(),
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{entry ? 'Edit Entry' : 'Add Entry'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Type</label>
            <div className="type-toggle type-toggle-3">
              <button
                type="button"
                className={type === 'income' ? 'active' : ''}
                onClick={() => handleTypeChange('income')}
              >
                Income
              </button>
              <button
                type="button"
                className={type === 'expense' ? 'active' : ''}
                onClick={() => handleTypeChange('expense')}
              >
                Expense
              </button>
              <button
                type="button"
                className={type === 'transfer' ? 'active' : ''}
                onClick={() => handleTypeChange('transfer')}
              >
                Transfer
              </button>
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="entry-date">Date</label>
            <input
              id="entry-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="entry-category">Category</label>
            <select
              id="entry-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {categories[type].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label htmlFor="entry-amount">Amount ($)</label>
            <input
              id="entry-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="entry-desc">Description</label>
            <input
              id="entry-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="optional"
            />
          </div>

          {error && <div className="error">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
