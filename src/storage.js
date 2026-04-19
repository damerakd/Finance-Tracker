import { DEFAULT_CATEGORIES } from './categories';

const STORAGE_KEY = 'finance-tracker';
const SCHEMA_VERSION = 1;

function emptyState() {
  return {
    version: SCHEMA_VERSION,
    entries: [],
    categories: DEFAULT_CATEGORIES,
  };
}

function read() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyState();
  try {
    const data = JSON.parse(raw);
    return {
      version: data.version ?? SCHEMA_VERSION,
      entries: Array.isArray(data.entries) ? data.entries : [],
      categories: data.categories ?? DEFAULT_CATEGORIES,
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

export function exportJSON() {
  return JSON.stringify(read(), null, 2);
}

export function importJSON(json) {
  const parsed = JSON.parse(json);
  const data = {
    version: parsed.version ?? SCHEMA_VERSION,
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    categories: parsed.categories ?? DEFAULT_CATEGORIES,
  };
  write(data);
  return data;
}
