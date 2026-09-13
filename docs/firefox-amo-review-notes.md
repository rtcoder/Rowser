# Firefox AMO Review Notes

These notes are intended for the Firefox Add-ons reviewer when submitting the
Firefox build of Rowser.

## Summary

Rowser is a local CSV and TSV viewer. It redirects eligible top-level CSV and
TSV document navigations into the extension viewer, then lets the user inspect
the file as a searchable table or as raw text.

Rowser does not upload file contents to Rowser, the developer, or any third
party service. CSV and TSV processing happens locally in the browser.

## Remote Code

Rowser is self-contained. The extension package includes its JavaScript, Web
Worker files, WebAssembly files, CSS, HTML, and icons. It does not load remote
scripts, remote workers, remote WebAssembly, or CDN assets.

The release workflow runs `scripts/verify-no-remote-code.sh firefox` against
`dist/firefox` before packaging the Firefox extension.

## DuckDB and WebAssembly

Rowser uses `@duckdb/duckdb-wasm` as a local table engine for CSV and TSV
import, search, sorting, and pagination. DuckDB runs locally from packaged
worker and WebAssembly assets.

The Firefox Manifest V3 `content_security_policy` includes
`'wasm-unsafe-eval'` because the extension uses WebAssembly. This follows the
Firefox WebExtensions CSP guidance for extensions that need WebAssembly.

`web-ext lint` reports warnings for generated DuckDB worker code, including
`eval` / `Function` constructor patterns, and warnings for bundled UI code that
references `innerHTML`. These warnings come from packaged dependency/runtime
code and bundled framework output. Rowser does not evaluate CSV or TSV file
contents as JavaScript, does not expose user-provided data to dynamic code
execution, and does not load executable code from remote origins.

## Permissions

The Firefox build requests:

- `webRequest` and `webRequestBlocking` to inspect top-level response headers
  and redirect eligible inline CSV/TSV documents into the extension viewer.
- `storage` for extension state used by the shared viewer/popup code.
- `http://*/*` and `https://*/*` host permissions so manual URL opening and
  automatic document redirects can fetch the selected CSV/TSV source.

The extension only redirects `GET` requests with `type: "main_frame"`. It does
not redirect subframes, XHR/fetch traffic, POST-generated responses, or
responses whose `Content-Disposition` marks them as attachments.

## Data Handling

Rowser reads CSV and TSV content from:

- an eligible top-level browser navigation,
- a manual URL entered by the user,
- a local file chosen by the user,
- a file dropped into the viewer.

File contents stay in the browser. The extension does not transmit file
contents to external servers.
