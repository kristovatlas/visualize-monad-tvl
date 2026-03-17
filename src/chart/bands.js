'use strict';

var statsModule = require('../model/stats');
var config = require('../config');

// Compute volatility band data for a TVL series
// series: [{date, tvl}, ...] sorted ascending
// Returns { timestamps, tvlValues, upper, lower, mean }
function computeBands(series) {
  if (!Array.isArray(series) || series.length === 0) {
    return { timestamps: [], tvlValues: [], upper: [], lower: [], mean: [] };
  }

  var timestamps = [];
  var tvlValues = [];
  for (var i = 0; i < series.length; i++) {
    timestamps.push(series[i].date);
    tvlValues.push(series[i].tvl);
  }

  var bands = statsModule.volatilityBands(tvlValues, config.ROLLING_WINDOW_DAYS, 2);

  return {
    timestamps: timestamps,
    tvlValues: tvlValues,
    upper: bands.upper,
    lower: bands.lower,
    mean: bands.mean
  };
}

// Create uPlot band configuration for volatility envelope
// Uses series indices for upper and lower bounds
function createBandConfig() {
  return {
    series: [
      {}, // x-axis (timestamps)
      {   // TVL line
        label: 'TVL',
        stroke: '#2563eb',
        width: 2,
        fill: undefined
      },
      {   // Upper band (hidden line, used for fill)
        label: 'Upper Band',
        stroke: 'transparent',
        width: 0
      },
      {   // Lower band (fill between upper and lower)
        label: 'Lower Band',
        stroke: 'transparent',
        width: 0,
        fill: 'rgba(37, 99, 235, 0.08)'
      }
    ],
    bands: [
      {
        series: [2, 3], // fill between upper (idx 2) and lower (idx 3)
        fill: 'rgba(37, 99, 235, 0.08)'
      }
    ]
  };
}

// Check which points are outside the volatility bands
// Returns array of indices where TVL is outside bands
function findOutliers(tvlValues, upper, lower) {
  var outliers = [];
  for (var i = 0; i < tvlValues.length; i++) {
    if (upper[i] === null || lower[i] === null) continue;
    if (tvlValues[i] > upper[i] || tvlValues[i] < lower[i]) {
      outliers.push(i);
    }
  }
  return outliers;
}

module.exports = {
  computeBands: computeBands,
  createBandConfig: createBandConfig,
  findOutliers: findOutliers
};
