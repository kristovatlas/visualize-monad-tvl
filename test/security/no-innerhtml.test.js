'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');

var srcDir = path.join(__dirname, '..', '..', 'src');

// Recursively find all .js files in a directory
function findJsFiles(dir) {
  var files = [];
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var fullPath = path.join(dir, entries[i].name);
    if (entries[i].isDirectory()) {
      files = files.concat(findJsFiles(fullPath));
    } else if (entries[i].name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

var BANNED_PATTERNS = [
  { pattern: /\.innerHTML\s*=/, name: 'innerHTML assignment' },
  { pattern: /\.outerHTML\s*=/, name: 'outerHTML assignment' },
  { pattern: /\.insertAdjacentHTML\s*\(/, name: 'insertAdjacentHTML' },
  { pattern: /document\.write\s*\(/, name: 'document.write' },
  { pattern: /[^_.]eval\s*\(/, name: 'eval()' },
  { pattern: /new\s+Function\s*\(/, name: 'new Function()' },
  { pattern: /setTimeout\s*\(\s*['"`]/, name: 'setTimeout with string' },
  { pattern: /setInterval\s*\(\s*['"`]/, name: 'setInterval with string' }
];

test('no banned DOM/eval patterns in source code', function () {
  var jsFiles = findJsFiles(srcDir);
  assert.ok(jsFiles.length > 0, 'Should find at least one JS file');

  var violations = [];

  for (var f = 0; f < jsFiles.length; f++) {
    var content = fs.readFileSync(jsFiles[f], 'utf8');
    var lines = content.split('\n');
    var relPath = path.relative(srcDir, jsFiles[f]);

    for (var l = 0; l < lines.length; l++) {
      var line = lines[l];
      // Skip comments
      if (line.trim().indexOf('//') === 0) continue;

      for (var p = 0; p < BANNED_PATTERNS.length; p++) {
        if (BANNED_PATTERNS[p].pattern.test(line)) {
          violations.push(relPath + ':' + (l + 1) + ' - ' + BANNED_PATTERNS[p].name + ': ' + line.trim());
        }
      }
    }
  }

  assert.equal(violations.length, 0,
    'Found banned patterns in source:\n' + violations.join('\n'));
});
