# Changelog

All notable changes to Rowser are listed here.

## v0.9.1

- Added a no-remote-CDN-code verification script for built extension assets.
- Documented the remote-code verification command and README screenshot guidance.
- Corrected README permissions text to match the `declarativeNetRequest` implementation.

## v0.9.0

- Added streaming remote-source reads for responses without `Content-Length`.
- Stops unknown-length remote sources after the recommended 512 MB limit and shows the oversized-file decision before table import.
- Allows `Open anyway` and `Show raw` to refetch oversized unknown-length sources after an explicit user decision.
- Added remote-source and viewer coverage for unknown-length oversized decisions.

## v0.8.5

- Added the subtle `Large file` viewer status for files from 50 MB up to the warning threshold.
- Added policy and viewer coverage for the 50-200 MB file-size band.

## v0.8.4

- Added packaged-extension e2e coverage for pagination across a larger CSV file.
- Verified that next-page navigation updates the displayed row range and table rows.

## v0.8.3

- Added explicit viewer error titles for empty files, unsupported local files, expired handoffs, and HTTP responses.
- Kept generic browser failures grouped under network errors.
- Added unit coverage for source-error classification and viewer source-error rendering.

## v0.8.2

- Added a DuckDB import retry that loads columns as text when automatic type inference fails.
- Shows a non-blocking viewer notice when Rowser falls back to text columns.
- Added integration and UI coverage for text-column fallback imports.

## v0.8.1

- Kept Raw mode directly reachable after table import errors.
- Added a Raw reader fallback for blob slices without `text()`.
- Added recovery coverage for table import failures.

## v0.8.0

- Added an `Open another file` recovery action for viewer load errors.
- Added unit and packaged-extension e2e coverage for error recovery.

## v0.7.4

- Added packaged-extension e2e coverage for quoted CSV values, multiline cells, and mixed-type columns.

## v0.7.3

- Added packaged-extension e2e coverage for manual URL opening.

## v0.7.2

- Added packaged-extension e2e coverage proving Table -> Raw -> Table does not refetch the source.

## v0.7.1

- Fixed Chrome DNR attachment exclusion by using `excludedResponseHeaders`.
- Expanded packaged-extension e2e coverage to TSV, MIME-only CSV, and attachment CSV navigations.

## v0.7.0

- Added Chromium extension e2e coverage for automatic top-level CSV navigation.
- Verified the packaged extension installs DNR redirect rules and opens the built viewer for CSV documents.
- Standardized Playwright e2e runs on the bundled Chromium channel.

## v0.6.0

- Added a reusable extension packaging script for Chrome now and Firefox later.
- Added a local `package:chrome` command that creates versioned release ZIPs from `dist/chrome`.
- Updated the release workflow to use the shared packaging script instead of inline ZIP commands.

## v0.5.1

- Added Chrome Web Store draft listing copy with privacy and permissions notes.
- Documented Rowser's file-size guidance and e2e test command in the README.

## v0.5.0

- Added Playwright configuration for browser-level viewer checks.
- Added an end-to-end test for opening a local CSV, importing it into the table, searching rows, and using sortable headers.
- Ignored Playwright runtime artifacts from test runs.

## v0.4.1

- Added DOM-level unit coverage for the table and pagination controls.
- Verified null rendering, sort cycling, page boundary buttons, row ranges, and page-size resets.

## v0.4.0

- Added DuckDB-WASM browser bundling for the Chrome viewer.
- Added a table engine that registers the loaded Blob, imports CSV/TSV data into `rowser_data`, and tracks stable `__rowser_rowid` ordering.
- Added metadata loading and paginated page queries through prepared statements.
- Replaced the Table placeholder with a real table view, sortable headers, search input, page size selector, and previous/next pagination.
- Added integration coverage for the table engine contract.

## v0.3.0

- Added shared table engine interfaces for metadata, pagination requests, and table pages.
- Added safe DuckDB query generation for table pagination, global search, and single-column sorting.
- Validated sort columns against imported metadata before quoting identifiers.
- Bound global search text as query parameters and excluded `__rowser_rowid` from visible search columns.
- Added unit coverage for identifier quoting, stable row ordering, SQL-backed pagination, and SQL injection resistance.

## v0.2.0

- Added Raw mode chunk planning and chunked reading for files above 10 MB.
- Added Raw view controls for previous/next chunk navigation and byte range display.
- Split viewer file drop, error display, and raw rendering into focused components.
- Added unit coverage for raw chunking and source-name helpers.

## v0.1.1

- Switched automatic CSV/TSV opening to Chrome `declarativeNetRequest` redirects so Chrome does not start downloading matching document responses before Rowser opens.
- Kept attachment responses excluded from automatic opening.
- Preserved MIME-only CSV/TSV detection through response-header redirect rules.

## v0.1

- Bootstrapped the Chromium Manifest V3 extension with Vite, React, and TypeScript.
- Added the Chrome build target under `extension/chrome`.
- Added `extension/shared` for browser-agnostic UI and core logic.
- Reserved `extension/firefox` for future Firefox support.
- Added CSV/TSV top-level document detection with unit coverage.
- Added the initial popup, viewer shell, remote/local source loading, raw view placeholder, and automatic navigation handoff.
- Added tag-driven GitHub release workflow with Chrome packaging and future Firefox packaging hook.
- Standardized local package and Chrome manifest version at `0.1.0`.
- Documented privacy, permissions, and the `dist/chrome` unpacked extension build path.
