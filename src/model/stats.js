'use strict';

// Compute rolling mean over a window of values
// data: array of numbers, window: integer >= 1
// Returns array of same length, with null for positions where window is incomplete
function rollingMean(data, window) {
  if (!Array.isArray(data) || window < 1) return [];
  var result = [];
  var sum = 0;
  for (var i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= window) {
      sum -= data[i - window];
    }
    if (i >= window - 1) {
      result.push(sum / window);
    } else {
      result.push(null);
    }
  }
  return result;
}

// Compute rolling standard deviation
// data: array of numbers, window: integer >= 2
// Returns array of same length, with null for incomplete windows
function rollingStdDev(data, window) {
  if (!Array.isArray(data) || window < 2) return [];
  var means = rollingMean(data, window);
  var result = [];
  for (var i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(null);
      continue;
    }
    var sumSqDiff = 0;
    for (var j = i - window + 1; j <= i; j++) {
      var diff = data[j] - means[i];
      sumSqDiff += diff * diff;
    }
    // Population std dev (not sample) since we have the full window
    result.push(Math.sqrt(sumSqDiff / window));
  }
  return result;
}

// Compute z-score of a value relative to a set of historical values
// Returns null if stdDev is 0 or data is insufficient
function zScore(value, historicalValues) {
  if (!Array.isArray(historicalValues) || historicalValues.length < 2) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;

  var sum = 0;
  var count = 0;
  for (var i = 0; i < historicalValues.length; i++) {
    if (typeof historicalValues[i] === 'number' && Number.isFinite(historicalValues[i])) {
      sum += historicalValues[i];
      count++;
    }
  }
  if (count < 2) return null;

  var mean = sum / count;
  var sumSqDiff = 0;
  for (var j = 0; j < historicalValues.length; j++) {
    if (typeof historicalValues[j] === 'number' && Number.isFinite(historicalValues[j])) {
      var diff = historicalValues[j] - mean;
      sumSqDiff += diff * diff;
    }
  }
  var stdDev = Math.sqrt(sumSqDiff / count);
  if (stdDev === 0) return null;

  return (value - mean) / stdDev;
}

// Compute day-over-day percentage changes from a TVL time series
// Input: [{date, tvl}, ...] sorted ascending
// Returns: [{date, tvl, changePct}, ...] (first entry has changePct: null)
function dailyChanges(series) {
  if (!Array.isArray(series) || series.length === 0) return [];
  var result = [{ date: series[0].date, tvl: series[0].tvl, changePct: null }];
  for (var i = 1; i < series.length; i++) {
    var prev = series[i - 1].tvl;
    var curr = series[i].tvl;
    var changePct = null;
    if (prev > 0) {
      changePct = ((curr - prev) / prev) * 100;
    }
    result.push({ date: series[i].date, tvl: series[i].tvl, changePct: changePct });
  }
  return result;
}

// Compute volatility bands (mean +/- numStdDevs * stdDev)
// tvlValues: array of TVL numbers
// window: rolling window size
// numStdDevs: number of standard deviations for band width (default 2)
// Returns { upper: number[], lower: number[], mean: number[] } with nulls for incomplete windows
function volatilityBands(tvlValues, window, numStdDevs) {
  if (typeof numStdDevs !== 'number') numStdDevs = 2;
  var means = rollingMean(tvlValues, window);
  var stdDevs = rollingStdDev(tvlValues, window);
  var upper = [];
  var lower = [];
  for (var i = 0; i < tvlValues.length; i++) {
    if (means[i] === null || stdDevs[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      upper.push(means[i] + numStdDevs * stdDevs[i]);
      lower.push(Math.max(0, means[i] - numStdDevs * stdDevs[i]));
    }
  }
  return { upper: upper, lower: lower, mean: means };
}

module.exports = {
  rollingMean: rollingMean,
  rollingStdDev: rollingStdDev,
  zScore: zScore,
  dailyChanges: dailyChanges,
  volatilityBands: volatilityBands
};
