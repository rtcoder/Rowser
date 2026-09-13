# Chrome Web Store Copy

## Summary

Instant CSV & TSV Viewer

## Graphic Assets

- Store icon: `docs/chrome-web-store/assets/store-icon-128.png` (128x128 PNG)
- Small promo tile: `docs/chrome-web-store/assets/promo-small-440x280.png` (440x280 PNG)
- Marquee promo tile: `docs/chrome-web-store/assets/promo-marquee-1400x560.png` (1400x560 PNG)

## Description

Rowser opens CSV and TSV documents directly in your browser as a searchable,
sortable table. It keeps the original raw text available, so you can switch
between Table and Raw views without downloading extra tools or uploading the
file elsewhere.

Rowser is built for top-level CSV and TSV documents served over HTTP or HTTPS,
manual URL opening, and local files selected in the viewer. Table mode supports
automatic delimiter/header detection through DuckDB-WASM, global search,
single-column sorting, SQL-backed pagination, and page sizes of 50, 100, 250,
and 500 rows.

## Privacy

Rowser processes CSV and TSV data locally in your browser. File contents are not
uploaded to Rowser or any third-party service.

## Permissions

Rowser requests broad HTTP and HTTPS host permissions so it can detect CSV and
TSV document navigations and open the Rowser viewer automatically. The extension
does not use telemetry, accounts, cloud sync, or a Rowser-controlled backend.

## Known Limitations

Automatic opening works for eligible top-level GET navigations. The viewer then
fetches the original URL once, so single-use URLs that cannot be fetched twice
may not work in v1.

Rowser targets normal table usage up to roughly 512 MB. Larger files may still
open, but table import can fail because of browser memory limits.
