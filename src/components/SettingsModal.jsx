import { useState } from 'react';

export default function SettingsModal({ settings, onSave, onClose }) {
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [model, setModel] = useState(settings.geminiModel || 'gemini-2.5-flash');
  const [reveal, setReveal] = useState(false);

  function handleSave() {
    onSave({ geminiApiKey: apiKey.trim(), geminiModel: model.trim() || 'gemini-2.5-flash' });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <div className="form-row">
          <label htmlFor="gemini-key">Gemini API key</label>
          <div className="key-row">
            <input
              id="gemini-key"
              type={reveal ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza…"
              autoComplete="off"
            />
            <button type="button" onClick={() => setReveal((r) => !r)}>
              {reveal ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="hint">
            Get a free key at{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              aistudio.google.com/apikey
            </a>
            . Stored only in this browser's localStorage. Never committed or synced.
          </p>
        </div>

        <div className="form-row">
          <label htmlFor="gemini-model">Model</label>
          <input
            id="gemini-model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gemini-2.5-flash"
          />
          <p className="hint">
            Default <code>gemini-2.5-flash</code>. Any Gemini vision model works.
          </p>
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
