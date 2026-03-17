'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var validate = require('../../src/api/validate');

var fixturesDir = path.join(__dirname, '..', 'fixtures');

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, name), 'utf8'));
}

// ============================================================
// validateChainTvlResponse
// ============================================================

test('validateChainTvlResponse: accepts valid fixture data', function () {
  var data = loadFixture('chain-tvl-valid.json');
  var result = validate.validateChainTvlResponse(data);
  assert.equal(result.ok, true);
  assert.equal(result.data.length, data.length);
  assert.equal(result.data[0].date, 1740787200);
  assert.equal(result.data[0].tvl, 1000000);
});

test('validateChainTvlResponse: accepts empty array', function () {
  var result = validate.validateChainTvlResponse([]);
  assert.equal(result.ok, true);
  assert.deepStrictEqual(result.data, []);
});

test('validateChainTvlResponse: accepts single element', function () {
  var result = validate.validateChainTvlResponse([{ date: 1740787200, tvl: 100 }]);
  assert.equal(result.ok, true);
  assert.equal(result.data.length, 1);
});

test('validateChainTvlResponse: rejects non-array types', function () {
  var badInputs = ['string', 42, null, undefined, true, { date: 1, tvl: 1 }];
  for (var i = 0; i < badInputs.length; i++) {
    var result = validate.validateChainTvlResponse(badInputs[i]);
    assert.equal(result.ok, false, 'Should reject: ' + JSON.stringify(badInputs[i]));
  }
});

test('validateChainTvlResponse: rejects entries with missing date', function () {
  var result = validate.validateChainTvlResponse([{ tvl: 100 }]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: rejects entries with missing tvl', function () {
  var result = validate.validateChainTvlResponse([{ date: 1740787200 }]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: rejects string date (type confusion)', function () {
  var result = validate.validateChainTvlResponse([{ date: '1740787200', tvl: 100 }]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: rejects string tvl (type confusion)', function () {
  var result = validate.validateChainTvlResponse([{ date: 1740787200, tvl: '100' }]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: rejects date below minimum bound', function () {
  var result = validate.validateChainTvlResponse([{ date: 1699999999, tvl: 100 }]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: rejects date above maximum bound', function () {
  var result = validate.validateChainTvlResponse([{ date: 2000000001, tvl: 100 }]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: accepts date at exact bounds', function () {
  var r1 = validate.validateChainTvlResponse([{ date: 1700000000, tvl: 0 }]);
  assert.equal(r1.ok, true);
  var r2 = validate.validateChainTvlResponse([{ date: 2000000000, tvl: 0 }]);
  assert.equal(r2.ok, true);
});

test('validateChainTvlResponse: rejects negative tvl', function () {
  var result = validate.validateChainTvlResponse([{ date: 1740787200, tvl: -1 }]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: accepts tvl at zero', function () {
  var result = validate.validateChainTvlResponse([{ date: 1740787200, tvl: 0 }]);
  assert.equal(result.ok, true);
});

test('validateChainTvlResponse: rejects tvl above 1T cap', function () {
  var result = validate.validateChainTvlResponse([{ date: 1740787200, tvl: 1e12 + 1 }]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: accepts tvl at exactly 1T', function () {
  var result = validate.validateChainTvlResponse([{ date: 1740787200, tvl: 1e12 }]);
  assert.equal(result.ok, true);
});

test('validateChainTvlResponse: rejects NaN tvl', function () {
  var result = validate.validateChainTvlResponse([{ date: 1740787200, tvl: NaN }]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: rejects Infinity tvl', function () {
  var result = validate.validateChainTvlResponse([{ date: 1740787200, tvl: Infinity }]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: rejects -Infinity tvl', function () {
  var result = validate.validateChainTvlResponse([{ date: 1740787200, tvl: -Infinity }]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: rejects non-integer date', function () {
  var result = validate.validateChainTvlResponse([{ date: 1740787200.5, tvl: 100 }]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: rejects unsorted entries', function () {
  var result = validate.validateChainTvlResponse([
    { date: 1740873600, tvl: 200 },
    { date: 1740787200, tvl: 100 }
  ]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: rejects duplicate dates', function () {
  var result = validate.validateChainTvlResponse([
    { date: 1740787200, tvl: 100 },
    { date: 1740787200, tvl: 200 }
  ]);
  assert.equal(result.ok, false);
});

test('validateChainTvlResponse: strips extra fields from output', function () {
  var result = validate.validateChainTvlResponse([
    { date: 1740787200, tvl: 100, extra: 'should be stripped' }
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.data[0].extra, undefined);
  assert.deepStrictEqual(Object.keys(result.data[0]).sort(), ['date', 'tvl']);
});

test('validateChainTvlResponse: handles prototype pollution attempt', function () {
  var malicious = JSON.parse('{"__proto__":{"polluted":true},"date":1740787200,"tvl":100}');
  // This should be fine since we only read .date and .tvl
  var result = validate.validateChainTvlResponse([malicious]);
  assert.equal(result.ok, true);
  assert.equal(({}).polluted, undefined, 'Prototype should not be polluted');
});

// ============================================================
// validateProtocolListResponse
// ============================================================

test('validateProtocolListResponse: accepts valid fixture data', function () {
  var data = loadFixture('protocols-valid.json');
  var result = validate.validateProtocolListResponse(data);
  assert.equal(result.ok, true);
  // Should filter to only Monad protocols with TVL
  assert.ok(result.data.length > 0);
  // Verify all results have Monad TVL
  for (var i = 0; i < result.data.length; i++) {
    assert.ok(typeof result.data[i].tvl === 'number');
    assert.ok(typeof result.data[i].slug === 'string');
    assert.ok(typeof result.data[i].name === 'string');
  }
});

test('validateProtocolListResponse: filters out non-Monad protocols', function () {
  var data = loadFixture('protocols-valid.json');
  var result = validate.validateProtocolListResponse(data);
  assert.equal(result.ok, true);
  var slugs = result.data.map(function (p) { return p.slug; });
  assert.ok(slugs.indexOf('eth-only') === -1, 'Should not include Ethereum-only protocol');
});

test('validateProtocolListResponse: extracts change fields', function () {
  var data = loadFixture('protocols-valid.json');
  var result = validate.validateProtocolListResponse(data);
  var morpho = result.data.find(function (p) { return p.slug === 'morpho'; });
  assert.ok(morpho);
  assert.equal(morpho.change_1h, -0.5);
  assert.equal(morpho.change_1d, 2.3);
  assert.equal(morpho.change_7d, 5.1);
});

test('validateProtocolListResponse: rejects non-array', function () {
  var badInputs = ['string', 42, null, undefined, {}];
  for (var i = 0; i < badInputs.length; i++) {
    var result = validate.validateProtocolListResponse(badInputs[i]);
    assert.equal(result.ok, false);
  }
});

test('validateProtocolListResponse: skips invalid entries gracefully', function () {
  var data = [
    { name: 'Good', slug: 'good', chains: ['Monad'], chainTvls: { Monad: 5000000 } },
    { name: '', slug: 'bad-empty-name', chains: ['Monad'], chainTvls: { Monad: 5000000 } },
    null,
    'string',
    42
  ];
  var result = validate.validateProtocolListResponse(data);
  assert.equal(result.ok, true);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].slug, 'good');
});

test('validateProtocolListResponse: rejects invalid slug patterns', function () {
  var badSlugs = [
    '../../../etc/passwd',
    'foo<script>',
    'foo bar',
    '',
    'UPPERCASE',
    'has_underscore',
    '-starts-with-dash'
  ];
  for (var i = 0; i < badSlugs.length; i++) {
    var data = [{ name: 'Test', slug: badSlugs[i], chains: ['Monad'], chainTvls: { Monad: 5000000 } }];
    var result = validate.validateProtocolListResponse(data);
    assert.equal(result.ok, true);
    assert.equal(result.data.length, 0, 'Should skip invalid slug: ' + JSON.stringify(badSlugs[i]));
  }
});

test('validateProtocolListResponse: accepts valid slug patterns', function () {
  var goodSlugs = ['a', 'morpho', 'curve-dex', 'uniswap-v3', 'a1b2c3'];
  for (var i = 0; i < goodSlugs.length; i++) {
    var data = [{ name: 'Test', slug: goodSlugs[i], chains: ['Monad'], chainTvls: { Monad: 5000000 } }];
    var result = validate.validateProtocolListResponse(data);
    assert.equal(result.data.length, 1, 'Should accept slug: ' + goodSlugs[i]);
  }
});

test('validateProtocolListResponse: rejects overly long name', function () {
  var longName = 'x'.repeat(201);
  var data = [{ name: longName, slug: 'test', chains: ['Monad'], chainTvls: { Monad: 5000000 } }];
  var result = validate.validateProtocolListResponse(data);
  assert.equal(result.data.length, 0);
});

// ============================================================
// validateProtocolDetailResponse
// ============================================================

test('validateProtocolDetailResponse: accepts valid fixture data', function () {
  var data = loadFixture('protocol-detail-valid.json');
  var result = validate.validateProtocolDetailResponse(data);
  assert.equal(result.ok, true);
  assert.ok(result.data.length > 0);
  // Verify totalLiquidityUSD is mapped to tvl
  assert.equal(result.data[0].tvl, 90000000);
  assert.equal(result.data[0].date, 1740787200);
});

test('validateProtocolDetailResponse: rejects non-object', function () {
  var badInputs = ['string', 42, null, undefined, [], true];
  for (var i = 0; i < badInputs.length; i++) {
    var result = validate.validateProtocolDetailResponse(badInputs[i]);
    assert.equal(result.ok, false);
  }
});

test('validateProtocolDetailResponse: rejects missing chainTvls', function () {
  var result = validate.validateProtocolDetailResponse({ name: 'Test' });
  assert.equal(result.ok, false);
});

test('validateProtocolDetailResponse: rejects missing Monad in chainTvls', function () {
  var result = validate.validateProtocolDetailResponse({
    chainTvls: { Ethereum: { tvl: [] } }
  });
  assert.equal(result.ok, false);
});

test('validateProtocolDetailResponse: rejects non-array tvl', function () {
  var result = validate.validateProtocolDetailResponse({
    chainTvls: { Monad: { tvl: 'not-array' } }
  });
  assert.equal(result.ok, false);
});

test('validateProtocolDetailResponse: rejects entry with bad totalLiquidityUSD', function () {
  var result = validate.validateProtocolDetailResponse({
    chainTvls: {
      Monad: {
        tvl: [{ date: 1740787200, totalLiquidityUSD: -1 }]
      }
    }
  });
  assert.equal(result.ok, false);
});

test('validateProtocolDetailResponse: rejects unsorted entries', function () {
  var result = validate.validateProtocolDetailResponse({
    chainTvls: {
      Monad: {
        tvl: [
          { date: 1740873600, totalLiquidityUSD: 200 },
          { date: 1740787200, totalLiquidityUSD: 100 }
        ]
      }
    }
  });
  assert.equal(result.ok, false);
});

test('validateProtocolDetailResponse: maps totalLiquidityUSD to tvl in output', function () {
  var result = validate.validateProtocolDetailResponse({
    chainTvls: {
      Monad: {
        tvl: [{ date: 1740787200, totalLiquidityUSD: 12345 }]
      }
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.data[0].tvl, 12345);
  assert.equal(result.data[0].totalLiquidityUSD, undefined);
});
