'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var protocols = require('../../src/model/protocols');
var config = require('../../src/config');

test('filterAndSort: sorts by TVL descending', function () {
  var input = [
    { slug: 'a', name: 'A', tvl: 1000000 },
    { slug: 'c', name: 'C', tvl: 50000000 },
    { slug: 'b', name: 'B', tvl: 10000000 }
  ];
  var result = protocols.filterAndSort(input);
  assert.equal(result[0].slug, 'c');
  assert.equal(result[1].slug, 'b');
  assert.equal(result[2].slug, 'a');
});

test('filterAndSort: filters out below threshold', function () {
  var input = [
    { slug: 'big', name: 'Big', tvl: 5000000 },
    { slug: 'tiny', name: 'Tiny', tvl: 500000 }
  ];
  var result = protocols.filterAndSort(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].slug, 'big');
});

test('filterAndSort: custom threshold', function () {
  var input = [
    { slug: 'a', name: 'A', tvl: 500000 },
    { slug: 'b', name: 'B', tvl: 100000 }
  ];
  var result = protocols.filterAndSort(input, 200000);
  assert.equal(result.length, 1);
  assert.equal(result[0].slug, 'a');
});

test('filterAndSort: returns fallback for empty input', function () {
  var result = protocols.filterAndSort([]);
  assert.deepStrictEqual(result, config.FALLBACK_PROTOCOLS);
});

test('filterAndSort: returns fallback for null input', function () {
  var result = protocols.filterAndSort(null);
  assert.deepStrictEqual(result, config.FALLBACK_PROTOCOLS);
});

test('filterAndSort: returns fallback when all below threshold', function () {
  var input = [{ slug: 'tiny', name: 'Tiny', tvl: 100 }];
  var result = protocols.filterAndSort(input);
  assert.deepStrictEqual(result, config.FALLBACK_PROTOCOLS);
});

test('filterAndSort: deduplicates by slug', function () {
  var input = [
    { slug: 'dup', name: 'Dup 1', tvl: 5000000 },
    { slug: 'dup', name: 'Dup 2', tvl: 6000000 },
    { slug: 'other', name: 'Other', tvl: 3000000 }
  ];
  var result = protocols.filterAndSort(input);
  var dupCount = result.filter(function (p) { return p.slug === 'dup'; }).length;
  assert.equal(dupCount, 1);
});

test('filterAndSort: does not mutate input', function () {
  var input = [
    { slug: 'b', name: 'B', tvl: 2000000 },
    { slug: 'a', name: 'A', tvl: 5000000 }
  ];
  var originalOrder = input.map(function (p) { return p.slug; });
  protocols.filterAndSort(input);
  assert.deepStrictEqual(input.map(function (p) { return p.slug; }), originalOrder);
});
