import { useState } from 'react';

const SECTIONS = [
  { key: 'income', title: 'Income', placeholder: 'New income category' },
  { key: 'expense', title: 'Expense', placeholder: 'New expense category' },
  { key: 'transfer', title: 'Transfer', placeholder: 'New transfer category' },
];

export default function CategoryManager({ categories, onSave, onClose }) {
  const [local, setLocal] = useState(() => ({
    income: [...(categories.income || [])],
    expense: [...(categories.expense || [])],
    transfer: [...(categories.transfer || [])],
  }));
  const [draft, setDraft] = useState({ income: '', expense: '', transfer: '' });

  function add(type) {
    const trimmed = draft[type].trim();
    if (!trimmed || local[type].includes(trimmed)) return;
    setLocal({ ...local, [type]: [...local[type], trimmed] });
    setDraft({ ...draft, [type]: '' });
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

        {SECTIONS.map(({ key, title, placeholder }) => (
          <div key={key} className="cat-section">
            <h3>{title}</h3>
            <ul className="cat-list">
              {local[key].map((c) => (
                <li key={c}>
                  <span>{c}</span>
                  <button type="button" onClick={() => remove(key, c)} aria-label={`Remove ${c}`}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="cat-add">
              <input
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                placeholder={placeholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    add(key);
                  }
                }}
              />
              <button type="button" onClick={() => add(key)}>
                Add
              </button>
            </div>
          </div>
        ))}

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
