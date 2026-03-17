'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');

// We need to mock globalThis.fetch for these tests.
// Save and restore original fetch around each test.

var fetchModule = require('../../src/api/fetch');

test('_isAllowedUrl: accepts valid API URLs', function () {
  assert.equal(fetchModule._isAllowedUrl('https://api.llama.fi'), true);
  assert.equal(fetchModule._isAllowedUrl('https://api.llama.fi/protocols'), true);
  assert.equal(fetchModule._isAllowedUrl('https://api.llama.fi/v2/historicalChainTvl/Monad'), true);
});

test('_isAllowedUrl: rejects non-API URLs', function () {
  assert.equal(fetchModule._isAllowedUrl('https://evil.com'), false);
  assert.equal(fetchModule._isAllowedUrl('https://api.llama.fi.evil.com/'), false);
  assert.equal(fetchModule._isAllowedUrl('http://api.llama.fi/protocols'), false);
  assert.equal(fetchModule._isAllowedUrl(''), false);
  assert.equal(fetchModule._isAllowedUrl(null), false);
  assert.equal(fetchModule._isAllowedUrl(undefined), false);
  assert.equal(fetchModule._isAllowedUrl(42), false);
});

test('safeFetch: rejects disallowed URL without network call', async function () {
  var result = await fetchModule.safeFetch('https://evil.com/data');
  assert.equal(result.ok, false);
  assert.ok(result.error.indexOf('not allowed') !== -1);
});

test('safeFetch: returns ok result for valid JSON response', async function () {
  var originalFetch = globalThis.fetch;
  globalThis.fetch = function () {
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: function () { return Promise.resolve('{"test":true}'); },
      body: null
    });
  };
  // Patch headers to have a .get method
  globalThis.fetch = function () {
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: function (name) { return name === 'content-type' ? 'application/json' : null; } },
      text: function () { return Promise.resolve('{"test":true}'); },
      body: null
    });
  };

  try {
    var result = await fetchModule.safeFetch('https://api.llama.fi/test');
    assert.equal(result.ok, true);
    assert.deepStrictEqual(result.data, { test: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('safeFetch: rejects non-JSON content-type', async function () {
  var originalFetch = globalThis.fetch;
  globalThis.fetch = function () {
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: function (name) { return name === 'content-type' ? 'text/html' : null; } },
      text: function () { return Promise.resolve('<html></html>'); },
      body: null
    });
  };

  try {
    var result = await fetchModule.safeFetch('https://api.llama.fi/test');
    assert.equal(result.ok, false);
    assert.ok(result.error.indexOf('content-type') !== -1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('safeFetch: rejects HTTP 404 without retry', async function () {
  var callCount = 0;
  var originalFetch = globalThis.fetch;
  globalThis.fetch = function () {
    callCount++;
    return Promise.resolve({
      ok: false,
      status: 404,
      headers: { get: function () { return 'application/json'; } },
      text: function () { return Promise.resolve('{}'); },
      body: null
    });
  };

  try {
    var result = await fetchModule.safeFetch('https://api.llama.fi/test');
    assert.equal(result.ok, false);
    assert.ok(result.error.indexOf('404') !== -1);
    assert.equal(callCount, 1, 'Should not retry 404');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('safeFetch: handles malformed JSON', async function () {
  var originalFetch = globalThis.fetch;
  globalThis.fetch = function () {
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: function (name) { return name === 'content-type' ? 'application/json' : null; } },
      text: function () { return Promise.resolve('not json {{{'); },
      body: null
    });
  };

  try {
    var result = await fetchModule.safeFetch('https://api.llama.fi/test');
    assert.equal(result.ok, false);
    assert.ok(result.error.indexOf('Invalid JSON') !== -1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('safeFetch: rejects oversized content-length', async function () {
  var originalFetch = globalThis.fetch;
  globalThis.fetch = function () {
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: function (name) {
        if (name === 'content-type') return 'application/json';
        if (name === 'content-length') return '999999999';
        return null;
      }},
      text: function () { return Promise.resolve('{}'); },
      body: null
    });
  };

  try {
    var result = await fetchModule.safeFetch('https://api.llama.fi/test');
    assert.equal(result.ok, false);
    assert.ok(result.error.indexOf('too large') !== -1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('safeFetch: never throws, always returns result shape', async function () {
  var originalFetch = globalThis.fetch;
  globalThis.fetch = function () {
    return Promise.reject(new Error('network down'));
  };

  try {
    var result = await fetchModule.safeFetch('https://api.llama.fi/test');
    assert.equal(typeof result, 'object');
    assert.equal(result.ok, false);
    assert.ok(typeof result.error === 'string');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
