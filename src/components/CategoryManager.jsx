import { useState } from 'react';

export default function CategoryManager({ categories, onSave, onClose }) {
  const [local, setLocal] = useState(() => ({
    income: [...categories.income],
    expense: [...categories.expense],
  }));
  const [newIncome, setNewIncome] = useState('');
  const [newExpense, setNewExpense] = useState('');

  function add(type, name, reset) {
    const trimmed = name.trim();
    if (!trimmed || local[type].includes(trimmed)) return;
    setLocal({ ...local, [type]: [...local[type], trimmed] });
    reset('');
  }

  function remove(type, name) {
    setLocal({ ...local, [type]: local[type].filter((c) => c !== name) });
  }

  function handleSave() {
    onSave(local);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Manage Categories</h2>

        <div className="cat-section">
          <h3>Income</h3>
          <ul className="cat-list">
            {local.income.map((c) => (
              <li key={c}>
                <span>{c}</span>
                <button type="button" onClick={() => remove('income', c)} aria-label={`Remove ${c}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="cat-add">
            <input
              value={newIncome}
              onChange={(e) => setNewIncome(e.target.value)}
              placeholder="New income category"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add('income', newIncome, setNewIncome);
                }
              }}
            />
            <button type="button" onClick={() => add('income', newIncome, setNewIncome)}>
              Add
            </button>
          </div>
        </div>

        <div className="cat-section">
          <h3>Expense</h3>
          <ul className="cat-list">
            {local.expense.map((c) => (
              <li key={c}>
                <span>{c}</span>
                <button type="button" onClick={() => remove('expense', c)} aria-label={`Remove ${c}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="cat-add">
            <input
              value={newExpense}
              onChange={(e) => setNewExpense(e.target.value)}
              placeholder="New expense category"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add('expense', newExpense, setNewExpense);
                }
              }}
            />
            <button type="button" onClick={() => add('expense', newExpense, setNewExpense)}>
              Add
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="primary">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
