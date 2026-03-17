'use strict';

var config = require('../config');

var ALLOWED_ORIGIN = config.API_BASE;

// Validate that a URL starts with the allowed origin
function isAllowedUrl(url) {
  if (typeof url !== 'string') return false;
  // Must start with exact origin followed by /
  return url === ALLOWED_ORIGIN || url.indexOf(ALLOWED_ORIGIN + '/') === 0;
}

// Safe fetch wrapper that enforces origin, timeout, size cap, and content-type
// Returns {ok: boolean, data: any, error: string|undefined} - never throws
function safeFetch(url) {
  if (!isAllowedUrl(url)) {
    return Promise.resolve({ ok: false, data: null, error: 'URL not allowed: must start with ' + ALLOWED_ORIGIN });
  }

  return _fetchWithRetry(url, 0);
}

function _fetchWithRetry(url, attempt) {
  var controller = new AbortController();
  var timeoutId = setTimeout(function () {
    controller.abort();
  }, config.FETCH_TIMEOUT_MS);

  return fetch(url, { signal: controller.signal })
    .then(function (response) {
      clearTimeout(timeoutId);

      // Check for retryable server errors
      if (response.status >= 500 && attempt < config.FETCH_MAX_RETRIES - 1) {
        var delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(_fetchWithRetry(url, attempt + 1));
          }, delay);
        });
      }

      if (!response.ok) {
        return { ok: false, data: null, error: 'HTTP ' + response.status };
      }

      // Check content-type
      var contentType = response.headers.get('content-type') || '';
      if (contentType.indexOf('application/json') === -1 && contentType.indexOf('text/json') === -1) {
        return { ok: false, data: null, error: 'Unexpected content-type: ' + contentType };
      }

      // Read body with size cap
      return _readBodyWithSizeLimit(response);
    })
    .then(function (result) {
      clearTimeout(timeoutId);
      return result;
    })
    .catch(function (err) {
      clearTimeout(timeoutId);

      // Retry on network errors
      if (attempt < config.FETCH_MAX_RETRIES - 1 && err.name !== 'AbortError') {
        var delay = Math.pow(2, attempt) * 1000;
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(_fetchWithRetry(url, attempt + 1));
          }, delay);
        });
      }

      var message = err.name === 'AbortError' ? 'Request timed out' : 'Network error: ' + err.message;
      return { ok: false, data: null, error: message };
    });
}

function _readBodyWithSizeLimit(response) {
  // Try to check content-length header first
  var contentLength = response.headers.get('content-length');
  if (contentLength !== null) {
    var declaredSize = parseInt(contentLength, 10);
    if (!isNaN(declaredSize) && declaredSize > config.FETCH_MAX_BODY_BYTES) {
      return Promise.resolve({ ok: false, data: null, error: 'Response too large: ' + declaredSize + ' bytes' });
    }
  }

  // Use streaming reader if available for size enforcement
  if (response.body && typeof response.body.getReader === 'function') {
    return _readStreamWithLimit(response.body.getReader());
  }

  // Fallback: read as text (no streaming size check available)
  return response.text().then(function (text) {
    if (text.length > config.FETCH_MAX_BODY_BYTES) {
      return { ok: false, data: null, error: 'Response too large' };
    }
    return _parseJson(text);
  });
}

function _readStreamWithLimit(reader) {
  var chunks = [];
  var totalSize = 0;

  function read() {
    return reader.read().then(function (result) {
      if (result.done) {
        var text = _concatChunks(chunks);
        return _parseJson(text);
      }
      totalSize += result.value.length;
      if (totalSize > config.FETCH_MAX_BODY_BYTES) {
        reader.cancel();
        return { ok: false, data: null, error: 'Response exceeded size limit of ' + config.FETCH_MAX_BODY_BYTES + ' bytes' };
      }
      chunks.push(result.value);
      return read();
    });
  }

  return read();
}

function _concatChunks(chunks) {
  var decoder = new TextDecoder();
  var parts = [];
  for (var i = 0; i < chunks.length; i++) {
    parts.push(decoder.decode(chunks[i], { stream: i < chunks.length - 1 }));
  }
  return parts.join('');
}

function _parseJson(text) {
  try {
    var data = JSON.parse(text);
    return { ok: true, data: data, error: undefined };
  } catch (e) {
    return { ok: false, data: null, error: 'Invalid JSON: ' + e.message };
  }
}

module.exports = {
  safeFetch: safeFetch,
  // Exported for testing
  _isAllowedUrl: isAllowedUrl
};
