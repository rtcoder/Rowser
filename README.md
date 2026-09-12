# Rowser

Rowser — Instant CSV & TSV Viewer.

Rowser is a Chromium-first Manifest V3 extension that opens inline CSV and TSV
documents in a searchable table viewer while keeping the original raw text
available.

## Development

```bash
pnpm install
pnpm test
pnpm build
```

Load `dist/chrome/` as an unpacked extension after building.

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

Rowser requests `webRequest` and broad `http://*/*` / `https://*/*` host
permissions so the service worker can detect top-level CSV and TSV document
responses. It uses `storage.session` only for short-lived navigation handoff
metadata.

## Privacy

Rowser processes CSV and TSV data locally in your browser. File contents are not
uploaded to Rowser or any third-party service.

Automatic opening refetches eligible GET URLs in the extension viewer. Single-use
URLs that cannot be fetched twice may not work in v1.
