# Changelog

All notable changes to Rowser are listed here.

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
