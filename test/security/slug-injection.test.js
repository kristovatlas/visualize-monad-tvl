'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var config = require('../../src/config');

// Test slug validation regex directly
var SLUG_PATTERN = config.SLUG_PATTERN;

test('slug regex: accepts valid slugs', function () {
  var valid = ['a', 'morpho', 'curve-dex', 'uniswap-v3', 'a1b2c3', 'x0'];
  for (var i = 0; i < valid.length; i++) {
    assert.ok(SLUG_PATTERN.test(valid[i]), 'Should accept: ' + valid[i]);
  }
});

test('slug regex: rejects path traversal', function () {
  var attacks = [
    '../../../etc/passwd',
    '..\\..\\windows',
    'foo/../bar',
    '..',
    '.',
    './test'
  ];
  for (var i = 0; i < attacks.length; i++) {
    assert.ok(!SLUG_PATTERN.test(attacks[i]), 'Should reject path traversal: ' + attacks[i]);
  }
});

test('slug regex: rejects HTML/script injection', function () {
  var attacks = [
    '<script>alert(1)</script>',
    'foo<img>',
    '"onload=alert(1)',
    "' OR 1=1 --",
    'foo&bar',
    'foo;bar'
  ];
  for (var i = 0; i < attacks.length; i++) {
    assert.ok(!SLUG_PATTERN.test(attacks[i]), 'Should reject injection: ' + attacks[i]);
  }
});

test('slug regex: rejects URL-encoded variants', function () {
  var attacks = [
    '%2e%2e%2f',
    '%2e%2e/',
    'foo%00bar',
    'test%20space'
  ];
  for (var i = 0; i < attacks.length; i++) {
    assert.ok(!SLUG_PATTERN.test(attacks[i]), 'Should reject URL-encoded: ' + attacks[i]);
  }
});

test('slug regex: rejects null bytes', function () {
  assert.ok(!SLUG_PATTERN.test('foo\x00bar'));
  assert.ok(!SLUG_PATTERN.test('\x00'));
});

test('slug regex: rejects empty string', function () {
  assert.ok(!SLUG_PATTERN.test(''));
});

test('slug regex: rejects whitespace', function () {
  var attacks = ['foo bar', ' foo', 'foo ', '\tfoo', 'foo\n'];
  for (var i = 0; i < attacks.length; i++) {
    assert.ok(!SLUG_PATTERN.test(attacks[i]), 'Should reject whitespace: ' + JSON.stringify(attacks[i]));
  }
});

test('slug regex: rejects non-ASCII', function () {
  var attacks = ['\u{1F4A9}', 'caf\u00e9', '\u0000test', '\u200btest'];
  for (var i = 0; i < attacks.length; i++) {
    assert.ok(!SLUG_PATTERN.test(attacks[i]), 'Should reject non-ASCII: ' + JSON.stringify(attacks[i]));
  }
});

test('slug regex: rejects uppercase', function () {
  assert.ok(!SLUG_PATTERN.test('Morpho'));
  assert.ok(!SLUG_PATTERN.test('CURVE'));
});

test('slug regex: rejects slugs starting/ending with dash', function () {
  assert.ok(!SLUG_PATTERN.test('-foo'));
  assert.ok(!SLUG_PATTERN.test('foo-'));
  assert.ok(!SLUG_PATTERN.test('-'));
});
