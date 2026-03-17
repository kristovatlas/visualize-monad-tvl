'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var stats = require('../../src/model/stats');

// Helper: compare floats with tolerance
function assertClose(actual, expected, tolerance, msg) {
  if (tolerance === undefined) tolerance = 0.0001;
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    (msg || '') + ' expected ' + expected + ' got ' + actual
  );
}

// ============================================================
// rollingMean
// ============================================================

test('rollingMean: basic calculation', function () {
  var data = [10, 20, 30, 40, 50];
  var result = stats.rollingMean(data, 3);
  assert.equal(result[0], null);
  assert.equal(result[1], null);
  assertClose(result[2], 20);   // (10+20+30)/3
  assertClose(result[3], 30);   // (20+30+40)/3
  assertClose(result[4], 40);   // (30+40+50)/3
});

test('rollingMean: window=1 returns original values', function () {
  var data = [5, 10, 15];
  var result = stats.rollingMean(data, 1);
  assert.deepStrictEqual(result, [5, 10, 15]);
});

test('rollingMean: window equals data length', function () {
  var data = [10, 20, 30];
  var result = stats.rollingMean(data, 3);
  assert.equal(result[0], null);
  assert.equal(result[1], null);
  assertClose(result[2], 20);
});

test('rollingMean: empty array', function () {
  assert.deepStrictEqual(stats.rollingMean([], 3), []);
});

test('rollingMean: invalid inputs', function () {
  assert.deepStrictEqual(stats.rollingMean(null, 3), []);
  assert.deepStrictEqual(stats.rollingMean([1, 2], 0), []);
  assert.deepStrictEqual(stats.rollingMean([1, 2], -1), []);
});

// ============================================================
// rollingStdDev
// ============================================================

test('rollingStdDev: basic calculation', function () {
  var data = [10, 20, 30, 40, 50];
  var result = stats.rollingStdDev(data, 3);
  assert.equal(result[0], null);
  assert.equal(result[1], null);
  // stddev of [10,20,30] = sqrt(((−10)²+0²+10²)/3) = sqrt(200/3) ≈ 8.165
  assertClose(result[2], 8.1650, 0.001);
});

test('rollingStdDev: all identical values = 0', function () {
  var data = [5, 5, 5, 5];
  var result = stats.rollingStdDev(data, 3);
  assert.equal(result[2], 0);
  assert.equal(result[3], 0);
});

test('rollingStdDev: window < 2 returns empty', function () {
  assert.deepStrictEqual(stats.rollingStdDev([1, 2, 3], 1), []);
});

// ============================================================
// zScore
// ============================================================

test('zScore: normal value within distribution', function () {
  var historical = [100, 102, 98, 101, 99, 100, 103, 97, 101, 100];
  var score = stats.zScore(101, historical);
  assert.ok(score !== null);
  assert.ok(Math.abs(score) < 2, 'Normal value should have low z-score');
});

test('zScore: extreme outlier', function () {
  var historical = [100, 102, 98, 101, 99, 100, 103, 97, 101, 100];
  var score = stats.zScore(130, historical);
  assert.ok(score !== null);
  assert.ok(score > 3, 'Extreme value should have high z-score');
});

test('zScore: negative outlier', function () {
  var historical = [100, 102, 98, 101, 99, 100, 103, 97, 101, 100];
  var score = stats.zScore(70, historical);
  assert.ok(score !== null);
  assert.ok(score < -3, 'Extreme negative value should have very negative z-score');
});

test('zScore: returns null for zero stddev', function () {
  var score = stats.zScore(5, [5, 5, 5, 5]);
  assert.equal(score, null);
});

test('zScore: returns null for insufficient data', function () {
  assert.equal(stats.zScore(5, []), null);
  assert.equal(stats.zScore(5, [5]), null);
});

test('zScore: returns null for non-finite value', function () {
  assert.equal(stats.zScore(NaN, [1, 2, 3]), null);
  assert.equal(stats.zScore(Infinity, [1, 2, 3]), null);
});

// ============================================================
// dailyChanges
// ============================================================

test('dailyChanges: computes correct percentages', function () {
  var series = [
    { date: 1, tvl: 100 },
    { date: 2, tvl: 110 },
    { date: 3, tvl: 99 }
  ];
  var result = stats.dailyChanges(series);
  assert.equal(result.length, 3);
  assert.equal(result[0].changePct, null);
  assertClose(result[1].changePct, 10);      // (110-100)/100 * 100
  assertClose(result[2].changePct, -10);      // (99-110)/110 * 100
});

test('dailyChanges: handles zero previous value', function () {
  var series = [
    { date: 1, tvl: 0 },
    { date: 2, tvl: 100 }
  ];
  var result = stats.dailyChanges(series);
  assert.equal(result[1].changePct, null);
});

test('dailyChanges: empty input', function () {
  assert.deepStrictEqual(stats.dailyChanges([]), []);
});

test('dailyChanges: single element', function () {
  var result = stats.dailyChanges([{ date: 1, tvl: 100 }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].changePct, null);
});

// ============================================================
// volatilityBands
// ============================================================

test('volatilityBands: returns correct structure', function () {
  var values = [100, 105, 110, 108, 112, 115, 120, 118, 125, 130];
  var result = stats.volatilityBands(values, 3, 2);
  assert.ok(Array.isArray(result.upper));
  assert.ok(Array.isArray(result.lower));
  assert.ok(Array.isArray(result.mean));
  assert.equal(result.upper.length, values.length);
  assert.equal(result.lower.length, values.length);
  assert.equal(result.mean.length, values.length);
});

test('volatilityBands: nulls for incomplete window', function () {
  var values = [100, 105, 110];
  var result = stats.volatilityBands(values, 3, 2);
  assert.equal(result.upper[0], null);
  assert.equal(result.upper[1], null);
  assert.ok(result.upper[2] !== null);
});

test('volatilityBands: lower band never negative', function () {
  var values = [10, 5, 1, 0, 2, 3, 1];
  var result = stats.volatilityBands(values, 3, 2);
  for (var i = 0; i < result.lower.length; i++) {
    if (result.lower[i] !== null) {
      assert.ok(result.lower[i] >= 0, 'Lower band should never be negative');
    }
  }
});

test('volatilityBands: upper > lower when stddev > 0', function () {
  var values = [100, 105, 110, 108, 112];
  var result = stats.volatilityBands(values, 3, 2);
  for (var i = 2; i < result.upper.length; i++) {
    assert.ok(result.upper[i] >= result.lower[i]);
  }
});
