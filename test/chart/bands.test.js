'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var bands = require('../../src/chart/bands');

test('computeBands: returns correct structure', function () {
  var series = [
    { date: 1, tvl: 100 },
    { date: 2, tvl: 105 },
    { date: 3, tvl: 110 },
    { date: 4, tvl: 108 },
    { date: 5, tvl: 112 },
    { date: 6, tvl: 115 },
    { date: 7, tvl: 120 },
    { date: 8, tvl: 118 }
  ];
  var result = bands.computeBands(series);
  assert.equal(result.timestamps.length, 8);
  assert.equal(result.tvlValues.length, 8);
  assert.equal(result.upper.length, 8);
  assert.equal(result.lower.length, 8);
  assert.equal(result.mean.length, 8);
});

test('computeBands: empty series', function () {
  var result = bands.computeBands([]);
  assert.deepStrictEqual(result.timestamps, []);
  assert.deepStrictEqual(result.tvlValues, []);
});

test('findOutliers: identifies points outside bands', function () {
  var tvl = [100, 100, 100, 200, 100];
  var upper = [null, null, 110, 110, 110];
  var lower = [null, null, 90, 90, 90];
  var outliers = bands.findOutliers(tvl, upper, lower);
  assert.ok(outliers.indexOf(3) !== -1, 'Index 3 (200) should be an outlier');
  assert.ok(outliers.indexOf(2) === -1, 'Index 2 (100) should not be an outlier');
});

test('findOutliers: no outliers when all within bands', function () {
  var tvl = [100, 100, 100];
  var upper = [110, 110, 110];
  var lower = [90, 90, 90];
  var outliers = bands.findOutliers(tvl, upper, lower);
  assert.equal(outliers.length, 0);
});

test('findOutliers: skips null band entries', function () {
  var tvl = [200, 200, 100];
  var upper = [null, null, 110];
  var lower = [null, null, 90];
  var outliers = bands.findOutliers(tvl, upper, lower);
  assert.equal(outliers.length, 0, 'Should skip null band indices');
});
