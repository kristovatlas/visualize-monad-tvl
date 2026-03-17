'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');

var htmlPath = path.join(__dirname, '..', '..', 'public', 'index.html');

test('CSP meta tag exists and is correct', function () {
  var html = fs.readFileSync(htmlPath, 'utf8');

  // Extract CSP content
  var match = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  assert.ok(match, 'CSP meta tag must exist');

  var csp = match[1];

  // Check required directives
  assert.ok(csp.indexOf("default-src 'self'") !== -1, "Must have default-src 'self'");
  assert.ok(csp.indexOf('connect-src https://api.llama.fi') !== -1, 'Must restrict connect-src to api.llama.fi');
  assert.ok(csp.indexOf("script-src 'self'") !== -1, "Must have script-src 'self'");
  assert.ok(csp.indexOf("style-src 'self'") !== -1, "Must have style-src 'self'");

  // Check banned directives
  assert.ok(csp.indexOf('unsafe-eval') === -1, 'Must not contain unsafe-eval');
  assert.ok(csp.indexOf('unsafe-inline') === -1 || csp.indexOf("script-src 'unsafe-inline'") === -1,
    'Must not have unsafe-inline in script-src');
});

test('HTML does not contain inline scripts', function () {
  var html = fs.readFileSync(htmlPath, 'utf8');

  // Check for inline script content (not just src attributes)
  var inlineScriptPattern = /<script(?![^>]*\bsrc\b)[^>]*>[^<]+<\/script>/i;
  assert.ok(!inlineScriptPattern.test(html), 'HTML must not contain inline scripts');
});

test('HTML does not contain inline event handlers', function () {
  var html = fs.readFileSync(htmlPath, 'utf8');

  var eventHandlerPattern = /\bon\w+\s*=/i;
  assert.ok(!eventHandlerPattern.test(html), 'HTML must not contain inline event handlers (onclick, onload, etc.)');
});
