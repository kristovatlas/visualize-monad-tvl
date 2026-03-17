'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var anomaly = require('../../src/model/anomaly');
var stats = require('../../src/model/stats');

// Helper: generate stable series with a final drop
function makeStableThenDrop(days, stableTvl, dailyVariation, finalDropPct) {
  var series = [];
  var baseDate = 1740787200;
  for (var i = 0; i < days; i++) {
    var variation = (Math.sin(i) * dailyVariation * stableTvl) / 100;
    series.push({ date: baseDate + i * 86400, tvl: stableTvl + variation });
  }
  // Final entry with drop
  var lastTvl = series[series.length - 1].tvl;
  series.push({
    date: baseDate + days * 86400,
    tvl: lastTvl * (1 + finalDropPct / 100)
  });
  return stats.dailyChanges(series);
}

test('scoreProtocol: detects large anomaly (critical)', function () {
  var changes = makeStableThenDrop(30, 100000000, 1, -15);
  var result = anomaly.scoreProtocol(changes);
  assert.ok(result.score !== null);
  assert.equal(result.level, 'critical');
});

test('scoreProtocol: normal variation scores normal', function () {
  var changes = makeStableThenDrop(30, 100000000, 2, -1.5);
  var result = anomaly.scoreProtocol(changes);
  assert.equal(result.level, 'normal');
});

test('scoreProtocol: insufficient data returns null score', function () {
  var result = anomaly.scoreProtocol([]);
  assert.equal(result.score, null);
  assert.equal(result.level, 'normal');

  var result2 = anomaly.scoreProtocol([
    { date: 1, tvl: 100, changePct: null },
    { date: 2, tvl: 110, changePct: 10 }
  ]);
  assert.equal(result2.score, null);
});

test('scoreProtocol: handles null changePct in latest', function () {
  var changes = [
    { date: 1, tvl: 100, changePct: null },
    { date: 2, tvl: 110, changePct: 10 },
    { date: 3, tvl: 120, changePct: null }
  ];
  var result = anomaly.scoreProtocol(changes);
  assert.equal(result.score, null);
  assert.equal(result.level, 'normal');
});

// ============================================================
// detectChainWideEvent
// ============================================================

test('detectChainWideEvent: detects when 2+ protocols drop', function () {
  var protocols = [
    { name: 'A', slug: 'a', change_1d: -12 },
    { name: 'B', slug: 'b', change_1d: -15 },
    { name: 'C', slug: 'c', change_1d: 2 }
  ];
  var result = anomaly.detectChainWideEvent(protocols);
  assert.equal(result.detected, true);
  assert.equal(result.affectedCount, 2);
  assert.deepStrictEqual(result.affectedNames, ['A', 'B']);
});

test('detectChainWideEvent: not detected with only 1 drop', function () {
  var protocols = [
    { name: 'A', slug: 'a', change_1d: -12 },
    { name: 'B', slug: 'b', change_1d: 2 },
    { name: 'C', slug: 'c', change_1d: 5 }
  ];
  var result = anomaly.detectChainWideEvent(protocols);
  assert.equal(result.detected, false);
  assert.equal(result.affectedCount, 1);
});

test('detectChainWideEvent: not detected with no drops', function () {
  var protocols = [
    { name: 'A', slug: 'a', change_1d: 5 },
    { name: 'B', slug: 'b', change_1d: 2 }
  ];
  var result = anomaly.detectChainWideEvent(protocols);
  assert.equal(result.detected, false);
  assert.equal(result.affectedCount, 0);
});

test('detectChainWideEvent: custom threshold', function () {
  var protocols = [
    { name: 'A', slug: 'a', change_1d: -5 },
    { name: 'B', slug: 'b', change_1d: -6 }
  ];
  // Default threshold is -10, so these shouldn't trigger
  var result1 = anomaly.detectChainWideEvent(protocols);
  assert.equal(result1.detected, false);

  // With custom -4 threshold, both should trigger
  var result2 = anomaly.detectChainWideEvent(protocols, -4);
  assert.equal(result2.detected, true);
  assert.equal(result2.affectedCount, 2);
});

test('detectChainWideEvent: handles missing change_1d', function () {
  var protocols = [
    { name: 'A', slug: 'a', change_1d: null },
    { name: 'B', slug: 'b' }
  ];
  var result = anomaly.detectChainWideEvent(protocols);
  assert.equal(result.detected, false);
  assert.equal(result.affectedCount, 0);
});
