# Rowser Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. Keep each task independently reviewable and tested. Prefer TDD for pure logic and integration tests for browser-extension behavior.

**Goal:** Build **Rowser**, a Chromium-first Manifest V3 extension that instantly turns CSV and TSV documents into a searchable, sortable table while always allowing the user to switch back to the raw file.

**Architecture:** Rowser observes top-level document responses, recognizes inline CSV/TSV by URL extension or response MIME type, and replaces the tab with an extension-owned viewer. The viewer loads the original source once, keeps it locally for the lifetime of the tab, imports it into DuckDB-WASM for table operations, and exposes a `Table | Raw` UI. Local files and manually entered URLs use the same viewer and source abstraction.

**Tech Stack:** TypeScript, React, Vite, Chromium Manifest V3, `@duckdb/duckdb-wasm`, CSS modules/plain CSS, Vitest, React Testing Library, Playwright Chromium extension tests.

**Spec:** `codex.md` — this file is the source of truth.

## Global constraints

- Product name: **Rowser**.
- Tagline: **Instant CSV & TSV Viewer**.
- Chromium-first. Target Chrome, Edge, Brave, and Opera.
- Manifest V3 only.
- Minimum supported Chrome: **128**.
- CSV and TSV only in v1.
- Automatic viewer is the primary flow; manual URL and local-file opening are secondary flows.
- Do not intercept responses with `Content-Disposition: attachment`.
- `Table | Raw` must always be available for successfully loaded sources.
- Target normal usage up to roughly **512 MB**. This is a UX threshold, not a hard parser limit.
- Files above 512 MB require an explicit warning before table parsing.
- No OPFS, persistent indexing, persistent database cache, SQL console, Parquet conversion, analytics, telemetry, or cloud backend in v1.
- DuckDB-WASM is the query engine. Do not implement a custom CSV sorting/search engine.
- Use the single-threaded DuckDB-WASM setup in v1. Do not add SharedArrayBuffer/COOP/COEP complexity.
- All processing stays local in the browser. Rowser must not upload file contents anywhere.
- All extension runtime code and WASM assets must be bundled with the extension; no remote scripts or CDN dependencies.
- Render cell contents as text only. Never inject CSV/TSV cell values as HTML.
- The UI language is English in v1.
- Prefer simple, boring code over framework abstractions that are not needed by the current feature set.

---

# 1. Product behavior

## 1.1 Automatic opening

Rowser should inspect **top-level GET navigations** only.

A response is eligible when:

1. The URL pathname ends in `.csv` or `.tsv`, case-insensitive, **or**
2. The response `Content-Type` is one of:
   - `text/csv`
   - `text/tab-separated-values`
   - `application/csv`
   - `text/tsv`

The response must **not** be intercepted when `Content-Disposition` contains `attachment`, case-insensitive.

Examples:

- `https://example.com/report.csv` → Rowser.
- `https://example.com/export?id=123` + `Content-Type: text/csv` → Rowser.
- `https://example.com/report.csv` + `Content-Disposition: attachment` → normal browser download.
- HTML page containing a CSV link → do nothing until the user navigates to the CSV.
- XHR/fetch requests made by web applications → do not intercept.
- POST-generated downloads → do not intercept in v1.

### Platform note

Do **not** base the design on `chrome.mimeHandler`. As of the design date, Chromium's public MIME handler does not expose CSV/TSV to normal extensions. Use non-blocking `chrome.webRequest.onHeadersReceived` for top-level responses and replace the tab with the Rowser viewer using `chrome.tabs.update`.

This means the viewer performs its own GET for the original URL. Therefore automatic mode is intentionally limited to GET navigations. Single-use URLs that cannot be fetched twice are not guaranteed to work in v1.

## 1.2 Manual opening

The extension action opens a small popup with:

- `Open local file`
- URL input
- `Open URL`

`Open local file` opens the viewer and lets the user choose a `.csv` or `.tsv` file.

The viewer must also support drag-and-drop of a local `.csv` or `.tsv` file.

Manual URL mode must use the same source loader and viewer as automatic mode.

## 1.3 Viewer modes

Main mode switch:

```text
Table | Raw
```

The switch must not refetch the source.

### Table

Required v1 behavior:

- Detect CSV vs TSV and delimiter automatically.
- Detect header row automatically through DuckDB.
- Show column names.
- Show total rows and columns after import.
- Sort one column at a time:
  - ascending
  - descending
  - clear sort
- Global text search across all visible data columns.
- SQL-backed pagination.
- Page sizes: `50`, `100`, `250`, `500`.
- Default page size: `100`.
- Preserve a stable row order when no explicit sort is active.
- Show `NULL` distinctly from an empty string.
- Horizontal scrolling for wide files.
- Sticky header.
- Do not attempt spreadsheet editing.

### Raw

Required v1 behavior:

- Show original textual content, not a reconstructed CSV generated from DuckDB.
- Add `Wrap lines` toggle.
- Files up to 10 MB may be rendered completely.
- Files above 10 MB use a chunked raw viewer.
- Chunk size: 1 MiB.
- Controls:
  - Previous chunk
  - Next chunk
  - byte range indicator
- Raw view must never create one DOM node per row for a huge file.

---

# 2. File-size policy

Use these UX bands:

```text
0–50 MB       normal
50–200 MB     normal, show subtle "large file" status
200–512 MB    large-file warning before table import
>512 MB       strong warning before table import
```

For files above 200 MB, warning copy:

> This is a large file. Preparing the table may use significant memory and can make the browser temporarily unresponsive.

Buttons:

```text
Open table
Show raw
Cancel
```

For files above 512 MB, warning copy:

> This file is larger than Rowser's recommended 512 MB limit. Table mode may fail because of browser memory limits.

Buttons:

```text
Open anyway
Show raw
Cancel
```

Do not silently refuse the file.

When `Content-Length` is unavailable for a remote URL, start loading normally. If the accumulated source exceeds 512 MB, abort before DuckDB import and display the same `Open anyway / Show raw / Cancel` decision. `Open anyway` may refetch the source.

---

# 3. Browser permissions and privacy

Initial manifest permissions:

```json
{
  "permissions": [
    "storage",
    "webRequest"
  ],
  "host_permissions": [
    "http://*/*",
    "https://*/*"
  ]
}
```

Use `chrome.storage.session` only for short-lived navigation handoff metadata. Do not store source contents there.

The extension must have no telemetry and no Rowser-controlled network endpoint.

Add a concise privacy statement to README and Chrome Web Store copy:

> Rowser processes CSV and TSV data locally in your browser. File contents are not uploaded to Rowser or any third-party service.

Do not request permissions unrelated to the implemented feature set.

---

# 4. Navigation handoff

The service worker owns automatic detection.

On an eligible top-level response:

1. Read URL and response headers.
2. Confirm request method is GET.
3. Reject `Content-Disposition: attachment`.
4. Confirm URL extension or supported MIME type.
5. Generate a random navigation token with `crypto.randomUUID()`.
6. Store metadata in `chrome.storage.session` using that token.
7. Replace the current tab URL with:
   `chrome-extension://<id>/viewer.html?token=<uuid>`.

Stored metadata shape:

```ts
export interface NavigationHandoff {
  sourceUrl: string;
  detectedFormat: 'csv' | 'tsv' | 'unknown';
  mimeType: string | null;
  contentLength: number | null;
  fileName: string | null;
  createdAt: number;
}
```

Delete the handoff from session storage after the viewer consumes it.

Reject handoffs older than 60 seconds.

Do not intercept Rowser's own extension pages or non-main-frame traffic.

---

# 5. Source abstraction

All viewer entry paths must resolve to one interface.

```ts
export type SourceKind = 'remote' | 'local';

export interface RowserSource {
  kind: SourceKind;
  name: string;
  size: number | null;
  formatHint: 'csv' | 'tsv' | 'unknown';
  blob: Blob;
  originalUrl?: string;
}
```

Implement:

```ts
loadRemoteSource(url: string, signal: AbortSignal): Promise<RowserSource>
loadLocalSource(file: File): Promise<RowserSource>
```

Remote fetch rules:

```ts
fetch(url, {
  method: 'GET',
  credentials: 'include',
  redirect: 'follow',
  signal
});
```

Required failures:

- HTTP status outside 200–299 → show HTTP error.
- Browser/network failure → show network error.
- Empty file → show empty-file state.
- Unsupported local extension → reject before import.
- Source cannot be parsed as CSV/TSV → keep Raw mode available and show a table-mode parsing error.

The `Blob` is the canonical source during the viewer tab lifetime. Table and Raw modes operate on the same source object.

---

# 6. DuckDB-WASM engine

Create one DuckDB instance per viewer tab.

Do not create a persistent DuckDB database in v1.

Suggested engine API:

```ts
export interface SortSpec {
  column: string;
  direction: 'asc' | 'desc';
}

export interface PageRequest {
  page: number;
  pageSize: 50 | 100 | 250 | 500;
  search: string;
  sort: SortSpec | null;
}

export interface TableMetadata {
  columns: Array<{
    name: string;
    type: string;
  }>;
  rowCount: number;
}

export interface TablePage {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  page: number;
  pageSize: number;
  filteredRowCount: number;
}

export interface RowserTableEngine {
  importSource(source: RowserSource): Promise<TableMetadata>;
  getPage(request: PageRequest): Promise<TablePage>;
  dispose(): Promise<void>;
}
```

## 6.1 Import strategy

Register the source with DuckDB-WASM using a temporary internal filename:

```text
rowser-source.csv
```

or:

```text
rowser-source.tsv
```

Create one temporary table named:

```text
rowser_data
```

Include an internal stable row identifier:

```text
__rowser_rowid
```

Conceptual SQL:

```sql
CREATE TEMP TABLE rowser_data AS
SELECT
    row_number() OVER () - 1 AS __rowser_rowid,
    *
FROM read_csv_auto('rowser-source.csv');
```

The exact DuckDB-WASM registration API may vary by installed package version, but the architecture must remain:

```text
Blob/File -> registered DuckDB file -> TEMP TABLE rowser_data
```

Do not write a separate JavaScript CSV parser for the table path.

If automatic type inference fails because of inconsistent column values, retry once with all columns treated as strings and show a non-blocking status:

```text
Some column types could not be inferred. Rowser loaded the file as text.
```

## 6.2 Query rules

Default order:

```sql
ORDER BY __rowser_rowid ASC
```

Column sort:

```sql
ORDER BY "<validated-column>" ASC NULLS LAST, __rowser_rowid ASC
```

or:

```sql
ORDER BY "<validated-column>" DESC NULLS LAST, __rowser_rowid ASC
```

Never concatenate arbitrary user-provided column names. Sort column must match a column returned by imported metadata and must be quoted as an identifier.

Search values must be bound as query parameters.

Global search semantics:

- case-insensitive
- substring match
- all data columns
- internal `__rowser_rowid` excluded

Conceptual condition:

```sql
CAST("column_a" AS VARCHAR) ILIKE ?
OR CAST("column_b" AS VARCHAR) ILIKE ?
```

Parameter value:

```text
%search text%
```

Use the same filter expression for page data and filtered row count.

---

# 7. UI design

Keep the UI dense and tool-like, not spreadsheet-like.

Viewer layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Rowser   report.csv   18.4 MB   128,421 rows × 14 columns   │
│                                                              │
│ [Table] [Raw]     [ Search…                         ]        │
├──────────────────────────────────────────────────────────────┤
│ id ▲ │ name │ email │ created_at │ ...                       │
├──────┼──────┼───────┼────────────┼───────────────────────────┤
│ ...                                                          │
│ ...                                                          │
├──────────────────────────────────────────────────────────────┤
│ 1–100 of 128,421      ‹ Prev  1 / 1285  Next ›   [100 ▾]    │
└──────────────────────────────────────────────────────────────┘
```

Required states:

- loading source
- deciding large-file handling
- importing into DuckDB
- ready
- search/query running
- table parse failure with Raw still usable
- remote fetch failure
- empty file

Search behavior:

- 300 ms debounce.
- Ignore stale query results if a newer query has been issued.
- Empty search restores unfiltered rows.
- Preserve active sort while searching.

Column headers:

- first click → ascending
- second click → descending
- third click → no sort

System light/dark theme via `prefers-color-scheme`. No custom theme settings in v1.

---

# 8. Popup

The popup is deliberately small.

```text
Rowser

[ Open local file ]

URL
[ https://example.com/data.csv ]
[ Open URL ]
```

Do not duplicate the full viewer inside the popup.

`Open local file` opens `viewer.html?mode=local`.

`Open URL` validates `http:` or `https:` and opens:

```text
viewer.html?url=<encoded-url>
```

Drag-and-drop is implemented only on the full viewer page.

---

# 9. Project structure

Use this structure. Rowser is Chromium-first, but the repository must keep a
clear place for a future Firefox target from the beginning:

```text
rowser/
├── codex.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── docs/
│   └── README.md
├── extension/
│   ├── chrome/
│   │   ├── popup.html
│   │   ├── viewer.html
│   │   ├── vite.config.ts
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   └── icons/
│   │   │       ├── icon-16.png
│   │   │       ├── icon-32.png
│   │   │       ├── icon-48.png
│   │   │       └── icon-128.png
│   │   └── src/
│   │       ├── background/
│   │       │   ├── service-worker.ts
│   │       │   └── handoff-store.ts
│   │       ├── popup/
│   │       │   └── main.tsx
│   │       └── viewer/
│   │           └── main.tsx
│   ├── firefox/
│   │   └── README.md
│   └── shared/
│       └── src/
│           ├── background/
│           │   └── detect-document.ts
│           ├── popup/
│           │   ├── main.tsx
│           │   └── Popup.tsx
│           ├── viewer/
│           │   ├── main.tsx
│           │   ├── App.tsx
│           │   ├── viewer.css
│           │   ├── components/
│           │   │   ├── Toolbar.tsx
│           │   │   ├── SourceSummary.tsx
│           │   │   ├── DataTable.tsx
│           │   │   ├── Pagination.tsx
│           │   │   ├── RawView.tsx
│           │   │   ├── LargeFileDialog.tsx
│           │   │   ├── DropZone.tsx
│           │   │   └── ErrorState.tsx
│           │   ├── source/
│           │   │   ├── source-types.ts
│           │   │   ├── remote-source.ts
│           │   │   ├── local-source.ts
│           │   │   └── source-name.ts
│           │   ├── engine/
│           │   │   ├── duckdb-engine.ts
│           │   │   ├── duckdb-loader.ts
│           │   │   ├── query-builder.ts
│           │   │   └── engine-types.ts
│           │   ├── raw/
│           │   │   └── raw-reader.ts
│           │   └── state/
│           │       └── viewer-state.ts
│           └── shared/
│               ├── constants.ts
│               └── format-bytes.ts
├── tests/
│   ├── unit/
│   │   ├── detect-document.test.ts
│   │   ├── source-name.test.ts
│   │   ├── query-builder.test.ts
│   │   └── raw-reader.test.ts
│   ├── integration/
│   │   └── duckdb-engine.test.ts
│   ├── e2e/
│   │   ├── automatic-open.spec.ts
│   │   ├── attachment.spec.ts
│   │   ├── viewer-table.spec.ts
│   │   ├── viewer-raw.spec.ts
│   │   └── manual-open.spec.ts
│   └── fixtures/
│       ├── simple.csv
│       ├── simple.tsv
│       ├── quoted.csv
│       ├── multiline.csv
│       ├── mixed-types.csv
│       └── empty.csv
├── scripts/
    └── package-extension.mjs
└── dist/
    └── chrome/
```

---

# 10. Implementation tasks

## Task 1: Bootstrap the extension

**Deliverable:** Buildable MV3 extension with popup, viewer page, and service worker.

- [ ] Initialize Vite + React + TypeScript with pnpm.
- [ ] Configure multiple HTML entry points for popup and viewer.
- [ ] Add Manifest V3 with local CSP compatible with DuckDB-WASM.
- [ ] Add extension icons and basic Rowser branding.
- [ ] Add `pnpm dev`, `pnpm build`, `pnpm test`, and `pnpm test:e2e`.
- [ ] Verify `dist/chrome/` loads as an unpacked Chromium extension.
- [ ] Commit as `chore: bootstrap rowser extension`.

Acceptance:

```text
- Extension loads without manifest errors.
- Popup opens.
- viewer.html opens directly.
- Service worker is registered.
```

## Task 2: Implement document detection

**Files:**

```text
src/background/detect-document.ts
tests/unit/detect-document.test.ts
```

Public interface:

```ts
export interface ResponseMetadata {
  url: string;
  method: string;
  type: string;
  responseHeaders: Array<{ name?: string; value?: string }>;
}

export interface DetectionResult {
  shouldOpen: boolean;
  format: 'csv' | 'tsv' | 'unknown';
  mimeType: string | null;
  contentLength: number | null;
  fileName: string | null;
}

export function detectDocument(input: ResponseMetadata): DetectionResult;
```

Tests must cover:

```text
.csv URL
.tsv URL
uppercase .CSV
query string after .csv
text/csv MIME without extension
text/tab-separated-values MIME without extension
application/csv
Content-Disposition: inline
Content-Disposition: attachment
POST request
sub-frame/non-main-frame
unrelated text/plain URL
```

- [ ] Write detection tests first.
- [ ] Verify they fail.
- [ ] Implement pure detection logic.
- [ ] Verify all tests pass.
- [ ] Commit as `feat: detect csv and tsv document responses`.

## Task 3: Implement automatic navigation handoff

**Files:**

```text
src/background/service-worker.ts
src/background/handoff-store.ts
```

- [ ] Listen to non-blocking `chrome.webRequest.onHeadersReceived`.
- [ ] Restrict the listener to `main_frame` HTTP/HTTPS traffic.
- [ ] Run `detectDocument`.
- [ ] Create a UUID token for eligible responses.
- [ ] Store `NavigationHandoff` in `chrome.storage.session`.
- [ ] Replace the originating tab with `viewer.html?token=<uuid>`.
- [ ] Add 60-second expiry and one-time consumption.
- [ ] Add tests around handoff serialization/expiry.
- [ ] Commit as `feat: open eligible documents in rowser`.

Acceptance:

```text
inline .csv -> Rowser
inline .tsv -> Rowser
MIME-only CSV -> Rowser
attachment CSV -> browser behavior unchanged
```

## Task 4: Implement source loading

**Files:**

```text
src/viewer/source/*
```

- [ ] Implement token-to-remote-source resolution.
- [ ] Implement direct URL mode.
- [ ] Implement local file mode.
- [ ] Implement drag-and-drop validation.
- [ ] Use one `RowserSource` representation for all paths.
- [ ] Preserve the source Blob for Raw mode.
- [ ] Surface HTTP/network/empty-file errors explicitly.
- [ ] Commit as `feat: add unified csv and tsv source loading`.

Acceptance:

```text
automatic URL, manual URL, file picker and drag/drop all enter the same viewer pipeline
```

## Task 5: Add file-size gates

**Files:**

```text
src/viewer/components/LargeFileDialog.tsx
src/viewer/state/viewer-state.ts
src/shared/constants.ts
```

Constants:

```ts
export const LARGE_FILE_WARNING_BYTES = 200 * 1024 * 1024;
export const RECOMMENDED_MAX_BYTES = 512 * 1024 * 1024;
```

- [ ] Show no modal below 200 MB.
- [ ] Show standard warning at 200–512 MB.
- [ ] Show strong warning above 512 MB.
- [ ] `Show raw` must bypass DuckDB import.
- [ ] `Cancel` must release references to the source.
- [ ] Commit as `feat: add large file safety gates`.

## Task 6: Integrate DuckDB-WASM

**Files:**

```text
src/viewer/engine/duckdb-loader.ts
src/viewer/engine/duckdb-engine.ts
tests/integration/duckdb-engine.test.ts
```

- [ ] Bundle DuckDB-WASM and worker assets locally.
- [ ] Initialize one engine per viewer tab.
- [ ] Register the current source as a temporary DuckDB file.
- [ ] Import into `rowser_data`.
- [ ] Add `__rowser_rowid`.
- [ ] Return column metadata and total count.
- [ ] Add fallback import with string columns when type inference fails.
- [ ] Dispose DuckDB resources when the viewer unloads.
- [ ] Commit as `feat: add duckdb wasm table engine`.

Fixtures must verify:

```text
commas inside quoted cells
tabs
quoted quotes
multiline quoted fields
empty fields
NULL-like empty values
mixed types fallback
```

## Task 7: Build safe query generation

**Files:**

```text
src/viewer/engine/query-builder.ts
tests/unit/query-builder.test.ts
```

- [ ] Validate sort columns against imported schema.
- [ ] Quote identifiers safely.
- [ ] Bind search text as a parameter.
- [ ] Exclude `__rowser_rowid` from search.
- [ ] Add stable row-id tiebreaker to sorting.
- [ ] Generate page and count queries from the same filter state.
- [ ] Commit as `feat: add safe rowser table queries`.

Security test:

```text
A column name or search string containing SQL syntax must never become executable SQL.
```

## Task 8: Build Table mode

**Files:**

```text
src/viewer/components/DataTable.tsx
src/viewer/components/Pagination.tsx
src/viewer/components/Toolbar.tsx
src/viewer/App.tsx
```

- [ ] Render first page after import.
- [ ] Add sticky headers and horizontal scrolling.
- [ ] Implement three-state column sorting.
- [ ] Implement 300 ms debounced global search.
- [ ] Add page size selector.
- [ ] Add Previous/Next pagination.
- [ ] Display filtered vs total count when search is active.
- [ ] Render every cell as plain text.
- [ ] Commit as `feat: add searchable sortable table viewer`.

## Task 9: Build Raw mode

**Files:**

```text
src/viewer/raw/raw-reader.ts
src/viewer/components/RawView.tsx
tests/unit/raw-reader.test.ts
```

- [ ] Render complete raw text for files up to 10 MB.
- [ ] Use 1 MiB chunks above 10 MB.
- [ ] Implement previous/next chunk.
- [ ] Show current byte range.
- [ ] Add wrap-lines toggle.
- [ ] Keep raw mode available when DuckDB parsing fails.
- [ ] Commit as `feat: add raw file viewer`.

## Task 10: Build popup and manual flows

**Files:**

```text
src/popup/*
src/viewer/components/DropZone.tsx
```

- [ ] Add `Open local file`.
- [ ] Add URL input.
- [ ] Reject non-http(s) URLs in URL mode.
- [ ] Open the full viewer rather than rendering data in the popup.
- [ ] Add drag/drop to the viewer.
- [ ] Commit as `feat: add manual file and url opening`.

## Task 11: Viewer UX and error handling

Required errors:

```text
Network request failed
HTTP 401/403
HTTP 404
HTTP 5xx
Empty file
Unsupported local extension
CSV/TSV parsing failure
DuckDB initialization failure
Browser memory/import failure
Expired automatic-navigation token
```

- [ ] Every error gets a human-readable title and technical detail.
- [ ] Parsing errors keep Raw mode available.
- [ ] Add `Open another file` recovery action.
- [ ] Add source name, size, row count, and column count to header.
- [ ] Support system light/dark mode.
- [ ] Commit as `feat: finish viewer states and error recovery`.

## Task 12: End-to-end extension tests

Use Playwright with a persistent Chromium context and the built extension loaded unpacked.

Test server endpoints:

```text
/file.csv
/file.tsv
/mime-only
/attachment.csv
/quoted.csv
```

- [ ] Verify `.csv` automatic opening.
- [ ] Verify `.tsv` automatic opening.
- [ ] Verify MIME-only automatic opening.
- [ ] Verify attachment is not intercepted.
- [ ] Verify sorting.
- [ ] Verify global search.
- [ ] Verify pagination.
- [ ] Verify Table → Raw → Table does not cause a new source fetch.
- [ ] Verify manual URL mode.
- [ ] Verify local-file flow.
- [ ] Commit as `test: add rowser chromium e2e coverage`.

## Task 13: Packaging and store readiness

- [ ] Add production ZIP packaging script.
- [ ] Add README screenshots section.
- [ ] Document permissions and privacy.
- [ ] Document known limitation: automatic mode refetches GET resources.
- [ ] Document recommended 512 MB maximum.
- [ ] Verify no remote code exists in the bundle.
- [ ] Verify extension works in current Chrome, Edge, Brave, and Opera.
- [ ] Commit as `chore: prepare rowser for chromium distribution`.

---

# 11. Test fixture requirements

`simple.csv`

```csv
id,name,email
1,Alice,alice@example.com
2,Bob,bob@example.com
3,Charlie,charlie@example.com
```

`simple.tsv`

```text
id	name	email
1	Alice	alice@example.com
2	Bob	bob@example.com
```

`quoted.csv`

```csv
id,title,note
1,"Hello, world","A ""quoted"" value"
2,"Second","plain"
```

`multiline.csv`

```csv
id,note
1,"line one
line two"
2,"single line"
```

`mixed-types.csv`

```csv
id,value
1,100
2,text
3,300
```

`empty.csv` must be a zero-byte file.

---

# 12. Non-goals for v1

Do not implement these while completing the v1 plan:

```text
Firefox support
Safari support
editing cells
saving modifications back to source
multiple sheets/tabs
XLS/XLSX support
JSON viewer
persistent database/cache
OPFS
column indexes
SQL console
charts
aggregations dashboard
CSV -> Parquet
cloud sync
telemetry
accounts
settings sync
multiple-column sorting
complex per-column filter builder
infinite scrolling
```

These are separate future features.

---

# 13. v1.1 candidates

Only consider these after v1 is stable:

1. Per-column filters.
2. Hide/show columns.
3. Reorder columns.
4. Copy cell / row / selected rows.
5. Export filtered rows.
6. Encoding selector for non-UTF-8 files.
7. Remember page size and UI preferences.
8. Keyboard navigation.
9. Better local `file://` automatic handling.
10. Firefox port.

---

# 14. Definition of Done

Rowser v1 is complete when all of the following are true:

- Opening an inline CSV or TSV in Chromium automatically displays Rowser.
- A CSV/TSV delivered as an attachment is not intercepted.
- MIME-only CSV/TSV endpoints are recognized.
- The same viewer can open a local file, dropped file, or manually entered URL.
- `Table | Raw` works without refetching after the source is loaded.
- Table mode sorts columns.
- Table mode searches all columns.
- Pagination works for large row counts.
- Raw mode handles large sources without rendering the whole document.
- Files above 200 MB receive an explicit memory warning.
- Files above 512 MB can still be opened only after an explicit user decision.
- CSV parsing edge cases covered by fixtures pass.
- No cell content is injected as HTML.
- No source data leaves the browser except requests to the original source URL.
- Unit, integration, and Chromium E2E tests pass.
- `pnpm build` produces a loadable unpacked extension and a distributable ZIP.
- README clearly documents permissions, privacy, size guidance, and the automatic-mode double-GET limitation.

---

# 15. Codex execution rules

When implementing this project:

1. Work task-by-task in the order above.
2. Do not silently expand scope.
3. Run relevant tests after every task.
4. Keep TypeScript strict.
5. Prefer small focused modules.
6. Do not introduce a second table/query engine beside DuckDB-WASM.
7. Do not introduce persistent storage for source contents.
8. Do not replace pagination with infinite scrolling in v1.
9. Do not bypass browser security controls or CORS using external proxy services.
10. If a platform API behaves differently than assumed, stop that task, document the verified Chromium behavior, and choose the smallest compatible implementation.
11. Keep commits small and scoped to one task.
12. Before declaring v1 complete, run:

```bash
pnpm test
pnpm test:e2e
pnpm build
```

Then manually smoke-test the unpacked extension in Chromium with:

```text
small CSV
small TSV
quoted CSV
multiline CSV
MIME-only CSV URL
attachment CSV URL
local CSV
~200 MB generated CSV
>512 MB warning path
```
