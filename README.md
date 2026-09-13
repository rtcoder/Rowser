# Rowser

Rowser — Instant CSV & TSV Viewer.

Rowser is a browser extension that opens CSV and TSV documents in a searchable
table viewer while keeping the original raw text available.

The Chromium and Firefox targets can automatically redirect eligible top-level
CSV and TSV responses into the viewer. Manual URL opening, local files,
drag-and-drop, Table mode, and Raw mode are shared across both targets.

## Development

```bash
pnpm install
pnpm exec playwright install chromium
pnpm test
pnpm test:e2e
pnpm build:chrome
pnpm build:firefox
pnpm run verify:no-remote-code
pnpm run verify:no-remote-code:firefox
pnpm lint:firefox
```

Load `dist/chrome/` as an unpacked extension after building Chromium, or
`dist/firefox/` through `about:debugging` after building Firefox.
Automated extension tests use Playwright's bundled Chromium because official
Google Chrome and Microsoft Edge no longer support the command-line flags used
to side-load unpacked extensions. Verify branded Chrome manually through
`chrome://extensions` → `Load unpacked`.

## Versioning

Rowser starts at `v0.1`. Before `v1.0`, patch versions are for fixes,
packaging, and release infrastructure; minor versions are for meaningful
feature milestones.

## Repository Layout

- `docs/` is reserved for documentation and GitHub Pages.
- `extension/chrome/` contains the Chromium Manifest V3 target.
- `extension/firefox/` contains the Firefox Manifest V3 target.
- `extension/shared/` contains browser-agnostic UI and core logic where practical.
- `codex.md` stays in the repository root as the implementation plan.

## Permissions

The Chromium target requests `declarativeNetRequest`, `storage`, and broad
`http://*/*` / `https://*/*` host permissions so Chrome can redirect eligible
top-level CSV and TSV document responses into the extension viewer. It uses
`storage.session` only for short-lived navigation handoff metadata.

The Firefox target requests `webRequest`, `webRequestBlocking`, `storage`, and
host permissions so Firefox can redirect eligible top-level CSV and TSV
responses into the same viewer.

## Privacy

Rowser processes CSV and TSV data locally in your browser. File contents are not
uploaded to Rowser or any third-party service.

Automatic opening refetches eligible GET URLs in the extension viewer. Single-use
URLs that cannot be fetched twice may not work in v1.

## File Size Guidance

Rowser targets normal usage up to roughly 512 MB. Files above 200 MB show a
memory warning before table import, and files above 512 MB require an explicit
decision before Rowser attempts table mode. Raw mode remains available for large
files and reads sources in chunks instead of rendering one DOM node per row.

## Screenshots

Recommended Chrome Web Store screenshots:

- Table view with search, sorting, pagination, and the source summary visible.
- Raw view with line wrapping and chunk controls visible for a large file.
- Large-file warning dialog showing `Open anyway`, `Show raw`, and `Cancel`.

## Chrome Web Store

Draft listing copy lives in `docs/chrome-web-store.md`.

## Firefox Add-ons

Firefox testing guidance lives in `docs/firefox-testing.md`. Reviewer notes for
AMO live in `docs/firefox-amo-review-notes.md`.
