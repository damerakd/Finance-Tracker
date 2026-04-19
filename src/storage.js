import { DEFAULT_CATEGORIES } from './categories';

const STORAGE_KEY = 'finance-tracker';
const SCHEMA_VERSION = 2;

const DEFAULT_SETTINGS = {
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
};

function emptyState() {
  return {
    version: SCHEMA_VERSION,
    entries: [],
    categories: DEFAULT_CATEGORIES,
    settings: { ...DEFAULT_SETTINGS },
  };
}

function read() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyState();
  try {
    const data = JSON.parse(raw);
    return {
      version: SCHEMA_VERSION,
      entries: Array.isArray(data.entries) ? data.entries : [],
      categories: data.categories ?? DEFAULT_CATEGORIES,
      settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
    };
  } catch {
    return emptyState();
  }
}

function write(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadState() {
  return read();
}

export function saveEntry(entry) {
  const data = read();
  const i = data.entries.findIndex((e) => e.id === entry.id);
  if (i >= 0) data.entries[i] = entry;
  else data.entries.push(entry);
  write(data);
  return data;
}

export function saveEntries(entries) {
  const data = read();
  data.entries.push(...entries);
  write(data);
  return data;
}

export function deleteEntry(id) {
  const data = read();
  data.entries = data.entries.filter((e) => e.id !== id);
  write(data);
  return data;
}

export function saveCategories(categories) {
  const data = read();
  data.categories = categories;
  write(data);
  return data;
}

export function saveSettings(settings) {
  const data = read();
  data.settings = { ...data.settings, ...settings };
  write(data);
  return data;
}

export function exportJSON() {
  const data = read();
  const { settings: _settings, ...rest } = data;
  return JSON.stringify(rest, null, 2);
}

export function importJSON(json) {
  const parsed = JSON.parse(json);
  const current = read();
  const data = {
    version: SCHEMA_VERSION,
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    categories: parsed.categories ?? DEFAULT_CATEGORIES,
    settings: current.settings,
  };
  write(data);
  return data;
}
