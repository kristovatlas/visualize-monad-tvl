'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var config = require('../../src/config');

// Test URL construction logic (without hitting the network)
// We test the URL patterns that endpoints.js would generate

test('chain TVL URL is correctly formed', function () {
  var url = config.API_BASE + '/v2/historicalChainTvl/' + config.CHAIN_NAME;
  assert.equal(url, 'https://api.llama.fi/v2/historicalChainTvl/Monad');
});

test('protocols URL is correctly formed', function () {
  var url = config.API_BASE + '/protocols';
  assert.equal(url, 'https://api.llama.fi/protocols');
});

test('protocol detail URL is correctly formed for valid slugs', function () {
  var slugs = ['morpho', 'curve-dex', 'uniswap-v3'];
  for (var i = 0; i < slugs.length; i++) {
    var url = config.API_BASE + '/protocol/' + slugs[i];
    assert.ok(url.indexOf('https://api.llama.fi/protocol/') === 0);
    // Verify no double slashes or weird characters
    assert.ok(!/\/\/protocol/.test(url));
  }
});

test('slug validation prevents URL injection in protocol detail', function () {
  var maliciousSlugs = [
    'morpho?callback=evil',
    'morpho#fragment',
    'morpho/../../admin',
    'morpho\nHost: evil.com'
  ];
  for (var i = 0; i < maliciousSlugs.length; i++) {
    assert.ok(!config.SLUG_PATTERN.test(maliciousSlugs[i]),
      'Slug validation should reject: ' + JSON.stringify(maliciousSlugs[i]));
  }
});

test('CHAIN_NAME config is Monad', function () {
  assert.equal(config.CHAIN_NAME, 'Monad');
});

test('API_BASE uses HTTPS', function () {
  assert.ok(config.API_BASE.indexOf('https://') === 0);
});
