import { supabase } from './supabase';
import { DEFAULT_CATEGORIES } from './categories';

const STORAGE_KEY = 'finance-tracker';
const QUEUE_KEY = 'finance-tracker:queue';
const SCHEMA_VERSION = 3;

const DEFAULT_SETTINGS = {
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
};

const subscribers = new Set();
let draining = false;

/* ---------------- Local cache ---------------- */

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

/* ---------------- Pending-write queue (offline-safe) ---------------- */

function readQueue() {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const q = JSON.parse(raw);
    return Array.isArray(q) ? q : [];
  } catch {
    return [];
  }
}

function writeQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function enqueue(op) {
  const q = readQueue();
  q.push(op);
  writeQueue(q);
}

/* ---------------- Subscribers ---------------- */

export function subscribe(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function notify() {
  subscribers.forEach((cb) => cb(read()));
}

/* ---------------- Synchronous public API (used by UI) ---------------- */

export function loadState() {
  return read();
}

export function saveEntry(entry) {
  const data = read();
  const idx = data.entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) data.entries[idx] = entry;
  else data.entries.push(entry);
  write(data);
  enqueue({ t: 'upsert_entry', entry });
  drainQueue();
  return data;
}

export function saveEntries(entries) {
  const data = read();
  data.entries.push(...entries);
  write(data);
  for (const e of entries) enqueue({ t: 'upsert_entry', entry: e });
  drainQueue();
  return data;
}

export function deleteEntry(id) {
  const data = read();
  data.entries = data.entries.filter((e) => e.id !== id);
  write(data);
  enqueue({ t: 'delete_entry', id });
  drainQueue();
  return data;
}

export function saveCategories(categories) {
  const data = read();
  data.categories = categories;
  write(data);
  enqueue({ t: 'set_categories', categories });
  drainQueue();
  return data;
}

/** Settings stay local only — API keys never sync to cloud. */
export function saveSettings(settings) {
  const data = read();
  data.settings = { ...data.settings, ...settings };
  write(data);
  return data;
}

export function exportJSON() {
  const { settings: _s, ...rest } = read();
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
  for (const e of data.entries) enqueue({ t: 'upsert_entry', entry: e });
  enqueue({ t: 'set_categories', categories: data.categories });
  drainQueue();
  return data;
}

/* ---------------- Cloud sync ---------------- */

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

function toDbEntry(entry, userId) {
  return {
    id: entry.id,
    user_id: userId,
    date: entry.date,
    type: entry.type,
    category: entry.category,
    amount: entry.amount,
    description: entry.description ?? '',
  };
}

function fromDbEntry(row) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    category: row.category,
    amount: Number(row.amount),
    description: row.description ?? '',
  };
}

async function applyOp(op, userId) {
  if (op.t === 'upsert_entry') {
    const { error } = await supabase
      .from('entries')
      .upsert(toDbEntry(op.entry, userId), { onConflict: 'id' });
    if (error) throw error;
  } else if (op.t === 'delete_entry') {
    const { error } = await supabase.from('entries').delete().eq('id', op.id);
    if (error) throw error;
  } else if (op.t === 'set_categories') {
    const { error } = await supabase.from('user_categories').upsert(
      {
        user_id: userId,
        income: op.categories.income || [],
        expense: op.categories.expense || [],
      },
      { onConflict: 'user_id' }
    );
    if (error) throw error;
  }
}

export async function drainQueue() {
  if (draining) return;
  if (!navigator.onLine) return;
  const userId = await currentUserId();
  if (!userId) return;

  draining = true;
  try {
    while (true) {
      const q = readQueue();
      if (q.length === 0) break;
      const op = q[0];
      try {
        await applyOp(op, userId);
        const rest = readQueue().slice(1);
        writeQueue(rest);
      } catch (err) {
        console.warn('[sync] op failed, will retry later', err);
        break;
      }
    }
  } finally {
    draining = false;
  }
}

/**
 * Pull everything for the signed-in user from Supabase into the local cache.
 * If cloud is empty AND local has entries, push local up as a one-time seed.
 */
export async function syncFromCloud() {
  const userId = await currentUserId();
  if (!userId) return;

  await drainQueue();

  const [{ data: entriesRows, error: entriesErr }, { data: catRow, error: catErr }] =
    await Promise.all([
      supabase.from('entries').select('*').eq('user_id', userId),
      supabase.from('user_categories').select('*').eq('user_id', userId).maybeSingle(),
    ]);

  if (entriesErr) throw entriesErr;
  if (catErr) throw catErr;

  const cloudEntries = (entriesRows || []).map(fromDbEntry);
  const cloudCategories = catRow
    ? { income: catRow.income || [], expense: catRow.expense || [] }
    : null;

  const local = read();

  if (cloudEntries.length === 0 && local.entries.length > 0) {
    for (const e of local.entries) {
      await applyOp({ t: 'upsert_entry', entry: e }, userId);
    }
  } else {
    local.entries = cloudEntries;
  }

  if (!cloudCategories) {
    const seed = local.categories || DEFAULT_CATEGORIES;
    await applyOp({ t: 'set_categories', categories: seed }, userId);
    local.categories = seed;
  } else if (cloudCategories.income.length + cloudCategories.expense.length === 0) {
    const seed = local.categories?.income?.length ? local.categories : DEFAULT_CATEGORIES;
    await applyOp({ t: 'set_categories', categories: seed }, userId);
    local.categories = seed;
  } else {
    local.categories = cloudCategories;
  }

  write(local);
  notify();
}

/** Wipe cache and queue when signing out. Keeps settings (Gemini key) local. */
export function resetCache() {
  const keepSettings = read().settings;
  const fresh = { ...emptyState(), settings: keepSettings };
  write(fresh);
  writeQueue([]);
  notify();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    drainQueue();
  });
}
