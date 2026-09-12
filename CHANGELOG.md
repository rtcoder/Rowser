# Changelog

All notable changes to Rowser are listed here.

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
