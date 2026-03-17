'use strict';

var config = require('../config');

// Validate a single chain TVL entry: {date: number, tvl: number}
function isValidChainTvlEntry(entry) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return false;
  }
  if (typeof entry.date !== 'number' || !Number.isFinite(entry.date) || !Number.isInteger(entry.date)) {
    return false;
  }
  if (entry.date < config.MIN_UNIX_TIMESTAMP || entry.date > config.MAX_UNIX_TIMESTAMP) {
    return false;
  }
  if (typeof entry.tvl !== 'number' || !Number.isFinite(entry.tvl)) {
    return false;
  }
  if (entry.tvl < 0 || entry.tvl > config.MAX_TVL_USD) {
    return false;
  }
  return true;
}

// Validate the response from /v2/historicalChainTvl/Monad
// Expected: [{date: unix_ts, tvl: number}, ...]
function validateChainTvlResponse(data) {
  if (!Array.isArray(data)) {
    return { ok: false, error: 'Chain TVL response must be an array' };
  }
  if (data.length > config.MAX_ARRAY_LENGTH) {
    return { ok: false, error: 'Chain TVL array exceeds maximum length' };
  }
  var validated = [];
  var prevDate = -1;
  for (var i = 0; i < data.length; i++) {
    var entry = data[i];
    if (!isValidChainTvlEntry(entry)) {
      return { ok: false, error: 'Invalid chain TVL entry at index ' + i };
    }
    if (entry.date <= prevDate) {
      return { ok: false, error: 'Chain TVL entries not sorted ascending at index ' + i };
    }
    prevDate = entry.date;
    validated.push({ date: entry.date, tvl: entry.tvl });
  }
  return { ok: true, data: validated };
}

// Validate a single protocol from the /protocols list
function isValidProtocolSummary(entry) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return false;
  }
  if (typeof entry.name !== 'string' || entry.name.length === 0 || entry.name.length > config.MAX_NAME_LENGTH) {
    return false;
  }
  if (typeof entry.slug !== 'string' || !config.SLUG_PATTERN.test(entry.slug)) {
    return false;
  }
  if (entry.slug.length > config.MAX_NAME_LENGTH) {
    return false;
  }
  if (!Array.isArray(entry.chains)) {
    return false;
  }
  for (var i = 0; i < entry.chains.length; i++) {
    if (typeof entry.chains[i] !== 'string') {
      return false;
    }
  }
  return true;
}

// Extract Monad TVL from a protocol summary entry
// Returns the TVL number or null if not available
function extractMonadTvl(entry) {
  if (entry.chainTvls && typeof entry.chainTvls === 'object' && !Array.isArray(entry.chainTvls)) {
    var monadTvl = entry.chainTvls[config.CHAIN_NAME];
    if (typeof monadTvl === 'number' && Number.isFinite(monadTvl) && monadTvl >= 0 && monadTvl <= config.MAX_TVL_USD) {
      return monadTvl;
    }
  }
  return null;
}

// Extract percentage change fields from a protocol summary
function extractChanges(entry) {
  var changes = {};
  var fields = ['change_1h', 'change_1d', 'change_7d'];
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (typeof entry[field] === 'number' && Number.isFinite(entry[field])) {
      changes[field] = entry[field];
    } else {
      changes[field] = null;
    }
  }
  return changes;
}

// Validate the response from /protocols
// Returns only Monad-relevant protocols with validated fields
function validateProtocolListResponse(data) {
  if (!Array.isArray(data)) {
    return { ok: false, error: 'Protocol list response must be an array' };
  }
  if (data.length > config.MAX_PROTOCOL_LIST_LENGTH) {
    return { ok: false, error: 'Protocol list exceeds maximum length' };
  }
  var monadProtocols = [];
  for (var i = 0; i < data.length; i++) {
    var entry = data[i];
    if (!isValidProtocolSummary(entry)) {
      continue; // Skip invalid entries rather than failing the whole list
    }
    if (entry.chains.indexOf(config.CHAIN_NAME) === -1) {
      continue; // Not on Monad
    }
    var tvl = extractMonadTvl(entry);
    if (tvl === null) {
      continue; // No Monad TVL data
    }
    var changes = extractChanges(entry);
    monadProtocols.push({
      name: entry.name,
      slug: entry.slug,
      tvl: tvl,
      change_1h: changes.change_1h,
      change_1d: changes.change_1d,
      change_7d: changes.change_7d
    });
  }
  return { ok: true, data: monadProtocols };
}

// Validate a single protocol detail TVL entry
// Note: field is totalLiquidityUSD, not tvl
function isValidProtocolTvlEntry(entry) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return false;
  }
  if (typeof entry.date !== 'number' || !Number.isFinite(entry.date) || !Number.isInteger(entry.date)) {
    return false;
  }
  if (entry.date < config.MIN_UNIX_TIMESTAMP || entry.date > config.MAX_UNIX_TIMESTAMP) {
    return false;
  }
  if (typeof entry.totalLiquidityUSD !== 'number' || !Number.isFinite(entry.totalLiquidityUSD)) {
    return false;
  }
  if (entry.totalLiquidityUSD < 0 || entry.totalLiquidityUSD > config.MAX_TVL_USD) {
    return false;
  }
  return true;
}

// Validate the response from /protocol/{slug}
// Extracts chainTvls.Monad.tvl array
function validateProtocolDetailResponse(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Protocol detail response must be an object' };
  }
  if (!data.chainTvls || typeof data.chainTvls !== 'object' || Array.isArray(data.chainTvls)) {
    return { ok: false, error: 'Protocol detail missing chainTvls object' };
  }
  var monadData = data.chainTvls[config.CHAIN_NAME];
  if (!monadData || typeof monadData !== 'object' || Array.isArray(monadData)) {
    return { ok: false, error: 'Protocol detail missing chainTvls.' + config.CHAIN_NAME };
  }
  if (!Array.isArray(monadData.tvl)) {
    return { ok: false, error: 'Protocol detail chainTvls.' + config.CHAIN_NAME + '.tvl must be an array' };
  }
  if (monadData.tvl.length > config.MAX_ARRAY_LENGTH) {
    return { ok: false, error: 'Protocol detail TVL array exceeds maximum length' };
  }
  var validated = [];
  var prevDate = -1;
  for (var i = 0; i < monadData.tvl.length; i++) {
    var entry = monadData.tvl[i];
    if (!isValidProtocolTvlEntry(entry)) {
      return { ok: false, error: 'Invalid protocol TVL entry at index ' + i };
    }
    if (entry.date <= prevDate) {
      return { ok: false, error: 'Protocol TVL entries not sorted ascending at index ' + i };
    }
    prevDate = entry.date;
    validated.push({ date: entry.date, tvl: entry.totalLiquidityUSD });
  }
  return { ok: true, data: validated };
}

module.exports = {
  validateChainTvlResponse: validateChainTvlResponse,
  validateProtocolListResponse: validateProtocolListResponse,
  validateProtocolDetailResponse: validateProtocolDetailResponse,
  // Exported for testing only
  _isValidChainTvlEntry: isValidChainTvlEntry,
  _isValidProtocolSummary: isValidProtocolSummary,
  _isValidProtocolTvlEntry: isValidProtocolTvlEntry,
  _extractMonadTvl: extractMonadTvl
};
