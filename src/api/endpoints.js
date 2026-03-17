'use strict';

var config = require('../config');
var safeFetch = require('./fetch').safeFetch;
var validate = require('./validate');

// Fetch chain-wide historical TVL for Monad
function fetchChainTvl() {
  var url = config.API_BASE + '/v2/historicalChainTvl/' + config.CHAIN_NAME;
  return safeFetch(url).then(function (result) {
    if (!result.ok) {
      return { ok: false, data: null, error: 'Fetch failed: ' + result.error };
    }
    return validate.validateChainTvlResponse(result.data);
  });
}

// Fetch all protocols and filter to Monad
function fetchMonadProtocols() {
  var url = config.API_BASE + '/protocols';
  return safeFetch(url).then(function (result) {
    if (!result.ok) {
      return { ok: false, data: null, error: 'Fetch failed: ' + result.error };
    }
    return validate.validateProtocolListResponse(result.data);
  });
}

// Fetch detailed TVL history for a single protocol
// slug must already be validated by the protocol list validator
function fetchProtocolDetail(slug) {
  // Defense in depth: re-validate slug even though it came from validated data
  if (typeof slug !== 'string' || !config.SLUG_PATTERN.test(slug) || slug.length > config.MAX_NAME_LENGTH) {
    return Promise.resolve({ ok: false, data: null, error: 'Invalid protocol slug' });
  }
  var url = config.API_BASE + '/protocol/' + slug;
  return safeFetch(url).then(function (result) {
    if (!result.ok) {
      return { ok: false, data: null, error: 'Fetch failed for ' + slug + ': ' + result.error };
    }
    return validate.validateProtocolDetailResponse(result.data);
  });
}

// Fetch protocol details sequentially with delay to avoid hammering API
function fetchProtocolDetails(slugs) {
  var results = {};
  var index = 0;

  function next() {
    if (index >= slugs.length) {
      return Promise.resolve(results);
    }
    var slug = slugs[index];
    index++;
    return fetchProtocolDetail(slug).then(function (result) {
      if (result.ok) {
        results[slug] = result.data;
      }
      // Delay between requests
      if (index < slugs.length) {
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(next());
          }, config.FETCH_DELAY_MS);
        });
      }
      return results;
    });
  }

  return next();
}

module.exports = {
  fetchChainTvl: fetchChainTvl,
  fetchMonadProtocols: fetchMonadProtocols,
  fetchProtocolDetail: fetchProtocolDetail,
  fetchProtocolDetails: fetchProtocolDetails
};
