import { useState, useEffect, useMemo } from 'react';
import {
  loadState,
  saveEntry,
  deleteEntry,
  saveCategories,
  exportJSON,
  importJSON,
} from './storage';
import MonthSelector from './components/MonthSelector';
import SummaryCards from './components/SummaryCards';
import FilterChips from './components/FilterChips';
import EntryTable from './components/EntryTable';
import EntryModal from './components/EntryModal';
import CategoryManager from './components/CategoryManager';
import './App.css';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function App() {
  const [state, setState] = useState({
    entries: [],
    categories: { income: [], expense: [] },
  });
  const [month, setMonth] = useState(currentMonth());
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState({ open: false, editing: null });
  const [catMgrOpen, setCatMgrOpen] = useState(false);

  useEffect(() => {
    setState(loadState());
  }, []);

  const monthEntries = useMemo(
    () => state.entries.filter((e) => e.date.startsWith(month)),
    [state.entries, month]
  );

  const income = monthEntries
    .filter((e) => e.type === 'income')
    .reduce((s, e) => s + e.amount, 0);
  const expense = monthEntries
    .filter((e) => e.type === 'expense')
    .reduce((s, e) => s + e.amount, 0);
  const balance = income - expense;

  const visible = useMemo(() => {
    const sorted = [...monthEntries].sort((a, b) => b.date.localeCompare(a.date));
    if (filter === 'all') return sorted;
    return sorted.filter((e) => e.type === filter);
  }, [monthEntries, filter]);

  function handleSave(entry) {
    setState(saveEntry(entry));
    setModal({ open: false, editing: null });
  }

  function handleDelete(id) {
    if (!confirm('Delete this entry?')) return;
    setState(deleteEntry(id));
  }

  function handleCategoriesSave(categories) {
    setState(saveCategories(categories));
  }

  function handleExport() {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setState(importJSON(reader.result));
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Finance Tracker</h1>
        <div className="header-actions">
          <MonthSelector value={month} onChange={setMonth} />
          <button type="button" onClick={() => setCatMgrOpen(true)}>
            Categories
          </button>
          <button type="button" onClick={handleExport}>
            Export
          </button>
          <label className="import-btn">
            Import
            <input type="file" accept=".json,application/json" onChange={handleImport} hidden />
          </label>
        </div>
      </header>

      <SummaryCards income={income} expense={expense} balance={balance} />

      <div className="controls">
        <button
          type="button"
          className="add-btn"
          onClick={() => setModal({ open: true, editing: null })}
        >
          + Add Entry
        </button>
        <FilterChips value={filter} onChange={setFilter} />
      </div>

      <EntryTable
        entries={visible}
        onEdit={(e) => setModal({ open: true, editing: e })}
        onDelete={handleDelete}
      />

      {modal.open && (
        <EntryModal
          entry={modal.editing}
          categories={state.categories}
          onSave={handleSave}
          onClose={() => setModal({ open: false, editing: null })}
        />
      )}

      {catMgrOpen && (
        <CategoryManager
          categories={state.categories}
          onSave={handleCategoriesSave}
          onClose={() => setCatMgrOpen(false)}
        />
      )}
    </div>
  );
}
