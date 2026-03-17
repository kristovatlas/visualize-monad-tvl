'use strict';

var config = require('../config');

// Filter protocols to those meeting the TVL threshold, sorted by TVL descending
function filterAndSort(protocols, minTvl) {
  if (typeof minTvl !== 'number') {
    minTvl = config.MIN_TVL_THRESHOLD_USD;
  }
  if (!Array.isArray(protocols) || protocols.length === 0) {
    return config.FALLBACK_PROTOCOLS.slice();
  }

  var filtered = [];
  var seen = {};
  for (var i = 0; i < protocols.length; i++) {
    var p = protocols[i];
    if (p.tvl >= minTvl && !seen[p.slug]) {
      seen[p.slug] = true;
      filtered.push(p);
    }
  }

  if (filtered.length === 0) {
    return config.FALLBACK_PROTOCOLS.slice();
  }

  filtered.sort(function (a, b) {
    return b.tvl - a.tvl;
  });

  return filtered;
}

module.exports = {
  filterAndSort: filterAndSort
};
