# Monad TVL Monitor

A web frontend for monitoring protocol TVLs on the Monad blockchain, designed to help detect large sudden swings that may indicate theft events in progress.

Data sourced from [DefiLlama](https://defillama.com/chain/monad).

## Features

- **Chain-wide TVL chart** with historical data
- **Per-protocol TVL charts** with volatility bands (+/- 2 standard deviations)
- **Partial-day bias fix** -- the current (incomplete) day is visually distinguished with a dashed line and annotation, preventing misleading dropoff at the right edge of charts
- **Dashboard table** with 1h/24h/7d percentage changes, color-coded
- **Anomaly scoring** via z-score of daily changes against 30-day history (warning >= 2.0, critical >= 3.0)
- **Cross-protocol correlation** -- detects chain-wide events when multiple protocols drop simultaneously
- **Inline sparklines** showing 7-day trend per protocol
- **Auto-refresh** every 5 minutes
- Dark/light theme (follows system preference), responsive layout

## Security

- Strict input validation on all API responses (hand-written, no dependencies)
- Content Security Policy: `default-src 'self'; connect-src https://api.llama.fi; style-src 'self'; script-src 'self'`
- Safe DOM manipulation only (`document.createElement` / `createTextNode`); zero `innerHTML` anywhere
- Fetch wrapper enforces origin allowlist, 10MB size cap, 10s timeout, JSON content-type check
- Slug validation regex prevents path traversal, injection, and non-ASCII
- Automated security tests scan for banned patterns in source code
- LavaMoat `allow-scripts` blocks dependency install scripts

## Build & Run

```bash
git clone https://github.com/kristovatlas/visualize-monad-tvl.git
cd visualize-monad-tvl
git checkout dev
npm install --ignore-scripts
npm run copy-assets
npm run build
npx serve public
```

Open the URL printed by `serve` (usually http://localhost:3000).

## Development

```bash
npm run dev          # Build with source maps
npm test             # Run 123 unit + security tests
npm run test:security  # Security tests only
INTEGRATION=1 npm run test:integration  # Test against live DefiLlama API
```

## Architecture

- **Runtime dependencies**: 1 (uPlot, loaded as pre-built IIFE)
- **Bundler**: Browserify (LavaMoat-compatible)
- **Framework**: None (vanilla JS, CommonJS modules)
- **Test runner**: Node.js built-in `node:test` (zero test dependencies)

```
src/
  api/        # fetch wrapper, validators, API endpoints
  chart/      # uPlot chart factory, partial-day fix, volatility bands
  model/      # rolling stats, anomaly scoring, protocol discovery
  view/       # safe DOM helpers, dashboard table, alert banners
  config.js   # all constants and thresholds
  index.js    # entry point and orchestrator
```

## Known Limitations

- The `morpho-v1` protocol detail response exceeds the 10MB safety cap (~18MB), so its per-protocol chart won't render. Dashboard summary data still displays from the `/protocols` endpoint.
- Some protocols listed under Monad may lack chain-specific history in their detail endpoint; these are skipped gracefully.
