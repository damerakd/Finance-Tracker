# Finance Tracker

A simple, local-first web app to track monthly income and expenses.

## Getting started

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

To build a static production bundle:

```bash
npm run build
npm run preview
```

## Features

- Add, edit, and delete income/expense entries
- One view per month (selectable via month picker)
- Three summary cards: total income, total expenses, net balance
- Filter the table by All / Income / Expenses
- Add or remove your own categories
- **Upload a receipt or statement image → Gemini extracts entries → you review before saving**
- Export all data to a JSON file, import it back later
- Data stays in your browser (except images you explicitly upload to Gemini)

## Data model

Each entry:

```json
{
  "id": "uuid",
  "type": "income | expense",
  "date": "YYYY-MM-DD",
  "category": "Salary",
  "amount": 1234.56,
  "description": "optional text"
}
```

Stored under the localStorage key `finance-tracker` along with a `version` field (for future migrations) and a `categories` object.

---

## Design decisions

These were decided up-front so we wouldn't paint ourselves into a corner. Each one notes the alternative considered and why we chose what we chose.

### Stack: React + Vite

**Chosen over:** plain HTML/CSS/JS, Next.js.

The main page has several pieces that re-render together (summary cards react to entries, table reacts to filter + month). React handles that cleanly. Vite gives instant hot-reload in dev and a tiny static build for production. Next.js would be overkill — there's no server, no routing, no SEO concern.

### Storage: localStorage (with JSON export/import)

**Chosen over:** IndexedDB, JSON file on disk, backend + SQLite, cloud (Firebase/Supabase).

For a single-user personal tracker, localStorage is the simplest thing that works: no setup, no accounts, no server. It's capped around 5MB, which is more than enough for many years of entries. Export/import to JSON gives us a backup story and a migration path if we ever outgrow the browser.

**All storage reads/writes go through `src/storage.js`** — so if we later swap to IndexedDB or a backend, only that one file changes.

### Single combined table (not two side-by-side)

**Chosen over:** separate Income and Expenses tables.

Two tables looked tidy on a wide desktop, but they waste horizontal space, don't work on mobile, and make it harder to see your actual cash flow in chronological order. One table with a Type column (+ color + sign) and filter chips gives the same separation on demand without the cost.

### Summary cards show *this month only*

**Chosen over:** running total across all months.

The app is pitched as "check this month's income and expenses." Mixing months in the balance card would obscure that. If we add a yearly view later, that's where a running total belongs.

### Add Entry UX: modal popup

**Chosen over:** inline expanding form, separate page.

A modal keeps the main page stable — the table doesn't jump around when you add an entry. It also reuses cleanly for editing (same form, same validation). Separate page felt heavy for such a small form.

### Categories are user-editable

**Chosen over:** fixed preset list only.

Everyone's categories are different (pets, subscriptions, daycare, …). Giving the user a Categories button in the header to add/remove their own keeps the app flexible without adding cognitive load — the defaults cover common cases on day one.

### Currency: USD only (v1)

**Chosen over:** multi-currency with a selector.

Multi-currency means thinking about conversion rates, per-entry currency, and display. Out of scope for v1. Amounts are stored as plain numbers so we can add a currency field to the schema later without breaking existing data.

### Date format: `YYYY-MM-DD`

**Chosen over:** localized display like MM/DD/YYYY or DD/MM/YYYY.

ISO format is unambiguous, sorts lexicographically (so `a.date.localeCompare(b.date)` = chronological sort, no `Date` parsing needed), and filtering a month is a cheap `entry.date.startsWith('2026-04')`. Display formatting can be added later without changing how data is stored.

### Validation rules

- `amount` must be > 0
- `date`, `category`, `type` required
- `description` optional

Kept minimal so the form doesn't fight the user. Non-obvious edge cases (e.g. future-dated entries) are allowed on purpose — you might be planning ahead.

### Schema versioning

Every localStorage blob is stamped with a `version` field. If we ever change the entry shape, the loader can detect old versions and migrate them instead of crashing or silently dropping data. (Bumped to v2 when the `settings` slot was added.)

### Image parsing: Gemini vision, bring-your-own-key

**Chosen over:** Tesseract.js (free, poor accuracy), AWS Textract (needs backend), OpenAI/Claude vision (paid only), Ollama local (needs install + GPU).

We needed a parser that:
- Runs against a **static site** (no backend to babysit)
- Is **free** for personal volume
- Handles **both receipts (1 entry) and statements (N entries)** with the same call
- Returns **structured JSON** directly (no regex on OCR output)

Gemini 1.5/2.0 Flash is the only option that hits all four. Free tier (1,500 requests/day) easily covers personal use. `response_mime_type: "application/json"` forces structured output so we avoid parsing prose.

**Bring-your-own-key** — the user pastes a Gemini API key once; it's stored in `localStorage` under `settings.geminiApiKey`. The key never leaves their browser, never hits our repo, never hits any server we run. The tradeoff: anyone with access to the browser can read the key. Acceptable for a personal tracker.

**API key is excluded from `Export`** — a JSON export is safe to share/back up without leaking the key. `Import` preserves the existing local key rather than overwriting with whatever (or nothing) is in the file.

**Always review before save** — OCR/LLM amount misreads are real (`$1200` vs `$12.00` on a crumpled receipt). Extracted entries go into a review modal with editable date/type/category/amount/description and an include checkbox. Never auto-save.

**Privacy note in the README and UI** — uploading an image sends that image to Google. For receipts that's usually fine; for statements with account numbers, users should redact first or skip.

**All Gemini logic is behind `src/geminiApi.js`** — same "one module to swap" pattern as storage. Switching to Ollama (truly local, no network) or a different provider would change only that file.

### Light theme only (v1)

Dark mode is easy to add later (CSS variables are already set up by surface/text tokens) but not worth the extra surface area right now.

### Mobile: basic responsive

Below 640px the summary cards stack, the description column hides, and the add button goes full-width. Not a mobile-first design, but usable on a phone.

---

## Deferred features

These were considered and explicitly pushed to "later" to keep v1 shippable:

- Charts / visualizations
- Recurring entries (auto-add monthly salary, rent, etc.)
- Budgets and alerts
- Search across description text
- Year-over-year / multi-month summary views
- Multi-currency
- Dark mode
- Cloud sync / multi-device
- Bulk delete / bulk edit

## Project structure

```
src/
├── App.jsx              # Main orchestrator: state, data flow, layout
├── App.css              # All component styles
├── index.css            # Reset + CSS variables
├── main.jsx             # React entry point
├── categories.js        # DEFAULT_CATEGORIES (seed list)
├── storage.js           # localStorage read/write + JSON export/import
├── geminiApi.js         # Image → extracted entries via Gemini vision
└── components/
    ├── MonthSelector.jsx      # <input type="month">
    ├── SummaryCards.jsx       # Income / Expenses / Balance cards
    ├── FilterChips.jsx        # All / Income / Expenses toggle
    ├── EntryTable.jsx         # Sorted table + empty state
    ├── EntryModal.jsx         # Add/edit form (modal popup)
    ├── CategoryManager.jsx    # Add/remove categories (modal)
    ├── SettingsModal.jsx      # Gemini API key + model (modal)
    └── ReviewModal.jsx        # Review parsed entries before save (modal)
```
