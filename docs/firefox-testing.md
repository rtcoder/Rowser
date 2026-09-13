# Firefox Testing

Use this checklist before submitting the Firefox package to AMO.

## Build

```bash
pnpm install
pnpm build:firefox
pnpm run verify:no-remote-code:firefox
pnpm lint:firefox
sh scripts/package-extension.sh firefox v1.2.3
```

Expected `web-ext lint` result:

- `errors`: `0`
- `notices`: `0`
- warnings from bundled DuckDB/WASM code are currently expected

## Manual Firefox Smoke Test

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on`.
3. Select `dist/firefox/manifest.json`.
4. Open an inline `.csv` URL and confirm Rowser opens the table viewer.
5. Open an inline `.tsv` URL and confirm Rowser opens the table viewer.
6. Open a CSV response with `Content-Disposition: attachment` and confirm
   Firefox downloads it instead of Rowser redirecting it.
7. Open the Rowser popup and load a manual CSV URL.
8. Select a local CSV file in the viewer.
9. Drop a local CSV file into the viewer.
10. Switch between Table and Raw modes.
11. Use search, sorting, and pagination on a larger CSV.
