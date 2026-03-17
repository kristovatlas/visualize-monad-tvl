'use strict';

// All configuration constants for the TVL monitor

var config = {
  // DefiLlama API base URL - the ONLY allowed origin for fetches
  API_BASE: 'https://api.llama.fi',

  // Refresh interval in milliseconds (60 seconds)
  REFRESH_INTERVAL_MS: 60 * 1000,

  // Fetch safety limits
  FETCH_TIMEOUT_MS: 10000,
  FETCH_MAX_BODY_BYTES: 20 * 1024 * 1024, // 20MB
  FETCH_MAX_RETRIES: 3,

  // Validation bounds
  MIN_UNIX_TIMESTAMP: 1700000000,  // ~Nov 2023
  MAX_UNIX_TIMESTAMP: 2000000000,  // ~May 2033
  MAX_TVL_USD: 1e12,               // $1 trillion cap
  MAX_ARRAY_LENGTH: 100000,
  MAX_PROTOCOL_LIST_LENGTH: 50000,
  MAX_NAME_LENGTH: 200,
  SLUG_PATTERN: /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,

  // Protocol discovery
  MIN_TVL_THRESHOLD_USD: 1000000,  // $1M minimum to track
  CHAIN_NAME: 'Monad',

  // Fallback protocol list (used when API is unavailable)
  FALLBACK_PROTOCOLS: [
    { slug: 'morpho-v1', name: 'Morpho' },
    { slug: 'steakhouse-financial', name: 'Steakhouse Financial' },
    { slug: 'curve-dex', name: 'Curve DEX' },
    { slug: 'uniswap-v3', name: 'Uniswap V3' }
  ],

  // Anomaly detection thresholds
  ANOMALY_WARNING_ZSCORE: 2.0,
  ANOMALY_CRITICAL_ZSCORE: 3.0,
  CHAIN_WIDE_MIN_PROTOCOLS: 2,
  CHAIN_WIDE_DROP_THRESHOLD_PCT: -10,

  // Stats
  ROLLING_WINDOW_DAYS: 7,
  HISTORICAL_WINDOW_DAYS: 30,

  // Sequential fetch delay to avoid hammering API (ms)
  FETCH_DELAY_MS: 500
};

module.exports = config;
