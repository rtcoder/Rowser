# Rowser

Rowser — Instant CSV & TSV Viewer.

Rowser is a Chromium-first Manifest V3 extension that opens inline CSV and TSV
documents in a searchable table viewer while keeping the original raw text
available.

## Development

```bash
pnpm install
pnpm exec playwright install chromium
pnpm test
pnpm test:e2e
pnpm build
pnpm run verify:no-remote-code
```

Load `dist/chrome/` as an unpacked extension after building.
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
- `extension/firefox/` is reserved for future Firefox support.
- `extension/shared/` contains browser-agnostic UI and core logic where practical.
- `codex.md` stays in the repository root as the implementation plan.

## Permissions

Rowser requests `declarativeNetRequest`, `storage`, and broad `http://*/*` /
`https://*/*` host permissions so Chrome can redirect eligible top-level CSV
and TSV document responses into the extension viewer. It uses `storage.session`
only for short-lived navigation handoff metadata.

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
