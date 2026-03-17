'use strict';

var config = require('../config');
var stats = require('./stats');

// Score a single protocol's anomaly level based on its recent daily changes
// dailyChanges: [{date, tvl, changePct}, ...] from stats.dailyChanges
// Returns { score: number|null, level: 'normal'|'warning'|'critical' }
function scoreProtocol(dailyChanges) {
  if (!Array.isArray(dailyChanges) || dailyChanges.length < 3) {
    return { score: null, level: 'normal' };
  }

  // Get the most recent change
  var latest = dailyChanges[dailyChanges.length - 1];
  if (latest.changePct === null) {
    return { score: null, level: 'normal' };
  }

  // Get historical changes for z-score calculation (exclude the latest)
  var historicalWindow = Math.min(dailyChanges.length - 1, config.HISTORICAL_WINDOW_DAYS);
  var historicalChanges = [];
  for (var i = dailyChanges.length - 1 - historicalWindow; i < dailyChanges.length - 1; i++) {
    if (i >= 0 && dailyChanges[i].changePct !== null) {
      historicalChanges.push(dailyChanges[i].changePct);
    }
  }

  var score = stats.zScore(latest.changePct, historicalChanges);
  if (score === null) {
    return { score: null, level: 'normal' };
  }

  // Use absolute value of z-score for level determination
  // but preserve sign for directional information
  var absScore = Math.abs(score);
  var level = 'normal';
  if (absScore >= config.ANOMALY_CRITICAL_ZSCORE) {
    level = 'critical';
  } else if (absScore >= config.ANOMALY_WARNING_ZSCORE) {
    level = 'warning';
  }

  return { score: score, level: level };
}

// Detect chain-wide events (multiple protocols dropping simultaneously)
// protocols: [{name, slug, change_1d}, ...]
// threshold: minimum % drop to count (default from config)
// Returns { detected: boolean, affectedCount: number, affectedNames: string[] }
function detectChainWideEvent(protocols, threshold) {
  if (typeof threshold !== 'number') {
    threshold = config.CHAIN_WIDE_DROP_THRESHOLD_PCT;
  }

  var affected = [];
  for (var i = 0; i < protocols.length; i++) {
    var p = protocols[i];
    if (typeof p.change_1d === 'number' && p.change_1d <= threshold) {
      affected.push(p.name);
    }
  }

  return {
    detected: affected.length >= config.CHAIN_WIDE_MIN_PROTOCOLS,
    affectedCount: affected.length,
    affectedNames: affected
  };
}

module.exports = {
  scoreProtocol: scoreProtocol,
  detectChainWideEvent: detectChainWideEvent
};
