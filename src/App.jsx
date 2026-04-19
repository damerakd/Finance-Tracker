import { useState, useEffect, useMemo, useRef } from 'react';
import {
  loadState,
  saveEntry,
  saveEntries,
  deleteEntry,
  saveCategories,
  saveSettings,
  exportJSON,
  importJSON,
  subscribe,
  syncFromCloud,
  resetCache,
} from './storage';
import { parseFinancialImage } from './geminiApi';
import { getSession, onAuthChange, signOut } from './auth';
import MonthSelector from './components/MonthSelector';
import SummaryCards from './components/SummaryCards';
import FilterChips from './components/FilterChips';
import EntryTable from './components/EntryTable';
import EntryModal from './components/EntryModal';
import CategoryManager from './components/CategoryManager';
import SettingsModal from './components/SettingsModal';
import ReviewModal from './components/ReviewModal';
import LoginScreen from './components/LoginScreen';
import './App.css';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      setAuthLoading(false);
    });
    const unsub = onAuthChange((s) => {
      setSession(s);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  if (authLoading) {
    return (
      <div className="app-loading">
        <p>Loading…</p>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  return <Tracker session={session} syncing={syncing} setSyncing={setSyncing} />;
}

function Tracker({ session, syncing, setSyncing }) {
  const [state, setState] = useState(() => loadState());
  const [month, setMonth] = useState(currentMonth());
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState({ open: false, editing: null });
  const [catMgrOpen, setCatMgrOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [review, setReview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [syncError, setSyncError] = useState('');
  const uploadInputRef = useRef(null);

  useEffect(() => {
    const unsub = subscribe(setState);
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      setSyncing(true);
      setSyncError('');
      try {
        await syncFromCloud();
      } catch (err) {
        if (!cancelled) setSyncError(err?.message || 'Failed to sync');
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }
    sync();
    return () => {
      cancelled = true;
    };
  }, [session.user.id, setSyncing]);

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

  function handleSettingsSave(settings) {
    setState(saveSettings(settings));
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

  async function handleUpload(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    if (!state.settings.geminiApiKey) {
      setUploadError('Add your Gemini API key in Settings first.');
      setSettingsOpen(true);
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const extracted = await parseFinancialImage(
        file,
        state.categories,
        state.settings.geminiApiKey,
        state.settings.geminiModel
      );
      setReview(extracted);
    } catch (err) {
      setUploadError(err.message || 'Failed to parse image');
    } finally {
      setUploading(false);
    }
  }

  function handleReviewSave(entries) {
    if (entries.length > 0) setState(saveEntries(entries));
    setReview(null);
  }

  async function handleSignOut() {
    await signOut();
    resetCache();
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
          <button type="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
          <button type="button" onClick={handleExport}>
            Export
          </button>
          <label className="import-btn">
            Import
            <input type="file" accept=".json,application/json" onChange={handleImport} hidden />
          </label>
          <span className="user-chip" title={session.user.email}>
            {session.user.email}
            {syncing && <span className="sync-dot" title="Syncing…" />}
          </span>
          <button type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {syncError && (
        <div className="upload-error" role="alert">
          Sync error: {syncError}
          <button type="button" onClick={() => setSyncError('')} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <SummaryCards income={income} expense={expense} balance={balance} />

      <div className="controls">
        <div className="controls-left">
          <button
            type="button"
            className="add-btn"
            onClick={() => setModal({ open: true, editing: null })}
          >
            + Add Entry
          </button>
          <button
            type="button"
            className="upload-btn"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Parsing…' : 'Upload Receipt / Statement'}
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf"
            onChange={handleUpload}
            hidden
          />
        </div>
        <FilterChips value={filter} onChange={setFilter} />
      </div>

      {uploadError && (
        <div className="upload-error" role="alert">
          {uploadError}
          <button type="button" onClick={() => setUploadError('')} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

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

      {settingsOpen && (
        <SettingsModal
          settings={state.settings}
          onSave={handleSettingsSave}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {review && (
        <ReviewModal
          extracted={review}
          categories={state.categories}
          onSave={handleReviewSave}
          onClose={() => setReview(null)}
        />
      )}
    </div>
  );
}
