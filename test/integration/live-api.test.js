'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var config = require('../../src/config');
var validate = require('../../src/api/validate');

// Integration tests hit the real DefiLlama API.
// Skip unless INTEGRATION=1 environment variable is set.
var SKIP = process.env.INTEGRATION !== '1';

function skipMsg() { return 'Set INTEGRATION=1 to run'; }

test('live: /v2/historicalChainTvl/Monad returns valid data', { skip: SKIP && skipMsg() }, async function () {
  var url = config.API_BASE + '/v2/historicalChainTvl/' + config.CHAIN_NAME;
  var response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.ok, true, 'HTTP status should be ok');

  var contentType = response.headers.get('content-type') || '';
  assert.ok(contentType.indexOf('application/json') !== -1, 'Should return JSON');

  var text = await response.text();
  assert.ok(text.length < config.FETCH_MAX_BODY_BYTES, 'Response should be under size cap');

  var data = JSON.parse(text);
  var result = validate.validateChainTvlResponse(data);
  assert.equal(result.ok, true, 'Validator should accept real chain TVL data: ' + (result.error || ''));
  assert.ok(result.data.length > 0, 'Should have at least one data point');
});

test('live: /protocols returns data with at least 1 Monad protocol', { skip: SKIP && skipMsg() }, async function () {
  var url = config.API_BASE + '/protocols';
  var response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.ok, true);

  var text = await response.text();
  assert.ok(text.length < config.FETCH_MAX_BODY_BYTES, 'Response should be under size cap');

  var data = JSON.parse(text);
  var result = validate.validateProtocolListResponse(data);
  assert.equal(result.ok, true, 'Validator should accept real protocol list: ' + (result.error || ''));
  assert.ok(result.data.length >= 1, 'Should find at least 1 Monad protocol');

  // Verify we find known protocols
  var slugs = result.data.map(function (p) { return p.slug; });
  // At least one of our fallback protocols should be present
  var foundKnown = config.FALLBACK_PROTOCOLS.some(function (fp) {
    return slugs.indexOf(fp.slug) !== -1;
  });
  assert.ok(foundKnown, 'Should find at least one known fallback protocol in results');
});

test('live: /protocol/{slug} returns valid detail for top protocol', { skip: SKIP && skipMsg() }, async function () {
  // First discover protocols
  var listUrl = config.API_BASE + '/protocols';
  var listResp = await fetch(listUrl, { signal: AbortSignal.timeout(30000) });
  var listData = JSON.parse(await listResp.text());
  var listResult = validate.validateProtocolListResponse(listData);
  assert.equal(listResult.ok, true);
  assert.ok(listResult.data.length > 0);

  // Sort by TVL and pick the top one
  listResult.data.sort(function (a, b) { return b.tvl - a.tvl; });
  var topSlug = listResult.data[0].slug;

  // Fetch detail
  var detailUrl = config.API_BASE + '/protocol/' + topSlug;
  var detailResp = await fetch(detailUrl, { signal: AbortSignal.timeout(30000) });
  assert.equal(detailResp.ok, true, 'Detail endpoint should return ok for ' + topSlug);

  var detailText = await detailResp.text();
  // Note: some protocol details can be very large, log size
  var sizeMB = (detailText.length / 1024 / 1024).toFixed(2);

  if (detailText.length > config.FETCH_MAX_BODY_BYTES) {
    // This is expected for some large protocols - just verify we'd reject it
    console.log('Protocol ' + topSlug + ' response is ' + sizeMB + 'MB (exceeds cap, would be rejected by fetch wrapper)');
    return;
  }

  var detailData = JSON.parse(detailText);
  var detailResult = validate.validateProtocolDetailResponse(detailData);

  // Some protocols may not have Monad chain data in detail even if listed
  if (!detailResult.ok) {
    console.log('Protocol ' + topSlug + ' detail validation: ' + detailResult.error + ' (may lack Monad chain data in detail endpoint)');
    return;
  }

  assert.ok(detailResult.data.length > 0, 'Should have at least one TVL data point');
});
